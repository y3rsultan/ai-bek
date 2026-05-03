import { bot } from "./bot";
import {
  onboardingMessage,
  onboardingCompleteMessage,
  taskMessage,
  confirmedMessage,
  blockedTaskMessage,
  unlockMessage,
  photoRequestMessage,
  completedMessage,
  completedWithPhotoMessage,
} from "./messages";
import { createClient } from "@supabase/supabase-js";
import { notifyForeman } from "./notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Track users waiting to enter their name (onboarding)
const awaitingName = new Map<number, string>(); // chatId -> invite_code
// Track users waiting to send a photo for task completion
const awaitingPhoto = new Map<number, string>(); // chatId -> task_id

// --- /start with invite code ---
bot.command("start", async (ctx) => {
  const inviteCode = ctx.match?.trim();
  if (!inviteCode) {
    await ctx.reply("Используйте ссылку-приглашение от прораба для подключения.");
    return;
  }

  // Check if user already registered
  const chatId = ctx.chat.id;
  const { data: existing } = await supabase
    .from("users")
    .select("id, name, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (existing) {
    const { data: proj } = await supabase
      .from("projects")
      .select("name")
      .eq("id", existing.project_id)
      .single();
    await ctx.reply(`Вы уже подключены как ${existing.name} к проекту «${proj?.name || "—"}».`);
    return;
  }

  // Check invite code exists
  const { data: inviteUser } = await supabase
    .from("users")
    .select("id")
    .eq("invite_code", inviteCode)
    .is("telegram_chat_id", null)
    .single();

  if (!inviteUser) {
    // Maybe the invite was already used or doesn't exist — create a new worker placeholder
    awaitingName.set(chatId, inviteCode);
    await ctx.reply(onboardingMessage());
    return;
  }

  // Invite code found, link this telegram user
  awaitingName.set(chatId, inviteCode);
  await ctx.reply(onboardingMessage());
});

// --- /brigade command ---
bot.command("brigade", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: user } = await supabase
    .from("users")
    .select("id, project_id, brigade_id, role")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!user) {
    await ctx.reply("Вы не зарегистрированы.");
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });

  // Get all tasks for the project today
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, assigned_to, assignee:users!tasks_assigned_to_fkey(name)")
    .eq("project_id", user.project_id)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .order("status");

  if (!tasks || tasks.length === 0) {
    await ctx.reply("Сегодня задач нет.");
    return;
  }

  const statusLabel: Record<string, string> = {
    draft: "Черновик",
    sent: "Отправлено",
    confirmed: "В работе",
    completed: "Выполнено",
    blocked: "Заблокировано",
    incomplete: "Не выполнено",
  };

  let text = `Задачи на сегодня (${tasks.length}):\n\n`;
  for (const t of tasks) {
    const assignee = (t as any).assignee?.name || "не назначен";
    const status = statusLabel[t.status] || t.status;
    text += `${t.title}\n  ${assignee} / ${status}\n\n`;
  }

  await ctx.reply(text);
});

// --- /status command ---
bot.command("status", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: user } = await supabase
    .from("users")
    .select("id, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!user) {
    await ctx.reply("Вы не зарегистрированы.");
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });

  const { data: myTasks } = await supabase
    .from("tasks")
    .select("title, status")
    .eq("assigned_to", user.id)
    .eq("due_date", today)
    .neq("status", "cancelled");

  if (!myTasks || myTasks.length === 0) {
    await ctx.reply("У вас нет задач на сегодня.");
    return;
  }

  const statusLabel: Record<string, string> = {
    draft: "Черновик",
    sent: "Ожидает",
    confirmed: "В работе",
    completed: "Выполнено",
    blocked: "Заблокировано",
  };

  let text = `Мои задачи (${myTasks.length}):\n\n`;
  for (const t of myTasks) {
    text += `${t.title} / ${statusLabel[t.status] || t.status}\n`;
  }

  await ctx.reply(text);
});

// --- Callback queries (button presses) ---
bot.on("callback_query:data", async (ctx) => {
  try {
  const action = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  // Find worker
  const { data: worker } = await supabase
    .from("users")
    .select("id, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!worker) {
    await ctx.answerCallbackQuery({ text: "Вы не зарегистрированы." });
    return;
  }

  // Find the task: try by telegram_message_id first, fallback to most recent sent task
  const messageId = ctx.callbackQuery.message?.message_id;
  let task: any = null;

  if (messageId) {
    const { data: found } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", worker.id)
      .eq("telegram_message_id", messageId)
      .single();
    task = found;
  }

  if (!task) {
    const { data: found } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", worker.id)
      .in("status", ["sent", "confirmed"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    task = found;
  }

  if (!task) {
    await ctx.answerCallbackQuery({ text: "Задача не найдена." });
    return;
  }

  if (action === "confirm") {
    // Idempotency: already confirmed?
    if (task.status === "confirmed" || task.status === "completed") {
      await ctx.answerCallbackQuery({ text: "Уже принято!" });
      return;
    }

    await supabase
      .from("tasks")
      .update({ status: "confirmed" })
      .eq("id", task.id);

    await supabase.from("task_updates").insert({
      task_id: task.id,
      user_id: worker.id,
      update_type: "confirmed",
    });

    try {
      await ctx.answerCallbackQuery({ text: "Принято!" });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      // Send follow-up with "Готово" button
      const { text: confirmText, keyboard: confirmKb } = confirmedMessage(task.title);
      const sentMsg = await ctx.reply(confirmText, { reply_markup: confirmKb });
      await supabase
        .from("tasks")
        .update({ telegram_message_id: sentMsg.message_id })
        .eq("id", task.id);
    } catch (e) {
      console.error("Telegram callback response error:", e);
    }

    // Notify foreman
    const { data: workerInfo } = await supabase
      .from("users")
      .select("name, project_id")
      .eq("id", worker.id)
      .single();
    if (workerInfo) {
      notifyForeman(workerInfo.project_id, workerInfo.name, task.title, "confirmed");
    }
  }

  if (action === "complete") {
    if (task.status === "completed") {
      await ctx.answerCallbackQuery({ text: "Уже завершено!" });
      return;
    }

    if (task.photo_required) {
      awaitingPhoto.set(chatId, task.id);
      await ctx.answerCallbackQuery();
      await ctx.reply(photoRequestMessage());
    } else {
      await completeTask(task.id, worker.id);
      await ctx.answerCallbackQuery();
      await ctx.reply(completedMessage());
    }
  }

  if (action === "question") {
    await ctx.answerCallbackQuery();
    await ctx.reply("Напишите ваш вопрос текстом, и прораб получит уведомление.");
  }

  if (action === "problem") {
    await ctx.answerCallbackQuery();
    await ctx.reply("Опишите проблему текстом или отправьте голосовое сообщение.");
  }
  } catch (e) {
    console.error("Callback handler error:", e);
    try { await ctx.answerCallbackQuery(); } catch {}
  }
});

// --- Text messages ---
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Onboarding: waiting for name
  if (awaitingName.has(chatId)) {
    const inviteCode = awaitingName.get(chatId)!;
    awaitingName.delete(chatId);

    // Try to find existing user with this invite code
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, project_id")
      .eq("invite_code", inviteCode)
      .is("telegram_chat_id", null)
      .single();

    if (existingUser) {
      // Link telegram to existing user
      await supabase
        .from("users")
        .update({
          name: text.trim(),
          telegram_chat_id: chatId,
          telegram_username: ctx.from?.username || null,
        })
        .eq("id", existingUser.id);

      const { data: proj } = await supabase
        .from("projects")
        .select("name")
        .eq("id", existingUser.project_id)
        .single();

      await ctx.reply(onboardingCompleteMessage(text.trim(), proj?.name || "Стройка"));
    } else {
      // No user with that invite code — find project from any user with a similar code pattern
      // For MVP: find the first project and add as worker
      const { data: anyProject } = await supabase
        .from("projects")
        .select("id, name")
        .limit(1)
        .single();

      if (anyProject) {
        await supabase.from("users").insert({
          name: text.trim(),
          role: "worker",
          telegram_chat_id: chatId,
          telegram_username: ctx.from?.username || null,
          project_id: anyProject.id,
        });
        await ctx.reply(onboardingCompleteMessage(text.trim(), anyProject.name));
      } else {
        await ctx.reply("Проект не найден. Обратитесь к прорабу.");
      }
    }
    return;
  }

  // Worker says "готово" / "done"
  const lowerText = text.toLowerCase().trim();
  if (lowerText === "готово" || lowerText === "done" || lowerText === "сделано") {
    const { data: worker } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .single();

    if (!worker) return;

    // Find the most recent confirmed task
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", worker.id)
      .eq("status", "confirmed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!task) {
      await ctx.reply("Нет активных задач для завершения.");
      return;
    }

    if (task.photo_required) {
      awaitingPhoto.set(chatId, task.id);
      await ctx.reply(photoRequestMessage());
    } else {
      await completeTask(task.id, worker.id);
      await ctx.reply(completedMessage());
    }
    return;
  }

  // Otherwise — treat as problem report or question
  const { data: worker } = await supabase
    .from("users")
    .select("id, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!worker) return;

  await supabase.from("problems").insert({
    project_id: worker.project_id,
    reported_by: worker.id,
    description: text,
    category: "other",
  });

  await ctx.reply("⚠️ Сообщение передано прорабу.");
});

// --- Photo messages ---
bot.on("message:photo", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: worker } = await supabase
    .from("users")
    .select("id, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!worker) return;

  // Get the largest photo
  const photos = ctx.message.photo;
  const photo = photos[photos.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  // Download the photo
  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Upload to Supabase Storage
  const fileName = `${worker.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(fileName, buffer, { contentType: "image/jpeg" });

  if (uploadError) {
    console.error("Photo upload error:", uploadError);
  }

  const { data: urlData } = supabase.storage
    .from("photos")
    .getPublicUrl(fileName);
  const photoUrl = urlData?.publicUrl || fileName;

  // Check if awaiting photo for task completion
  if (awaitingPhoto.has(chatId)) {
    const taskId = awaitingPhoto.get(chatId)!;
    awaitingPhoto.delete(chatId);

    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_photo_url: photoUrl,
      })
      .eq("id", taskId);

    await supabase.from("task_updates").insert({
      task_id: taskId,
      user_id: worker.id,
      update_type: "completed",
      photo_url: photoUrl,
    });

    // Check for dependent tasks to unlock
    await unlockDependents(taskId);

    // Notify foreman
    const { data: completedTask } = await supabase
      .from("tasks")
      .select("title, project_id")
      .eq("id", taskId)
      .single();
    if (completedTask) {
      const { data: wInfo } = await supabase
        .from("users")
        .select("name")
        .eq("id", worker.id)
        .single();
      if (wInfo) {
        notifyForeman(completedTask.project_id, wInfo.name, completedTask.title, "completed");
      }
    }

    await ctx.reply(completedWithPhotoMessage());
    return;
  }

  // Photo without task context — save as problem with photo
  await supabase.from("problems").insert({
    project_id: worker.project_id,
    reported_by: worker.id,
    photo_url: photoUrl,
    category: "other",
    description: ctx.message.caption || "Фото от рабочего",
  });

  await ctx.reply("📸 Фото сохранено и передано прорабу.");
});

// --- Voice messages ---
bot.on("message:voice", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: worker } = await supabase
    .from("users")
    .select("id, project_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!worker) return;

  const file = await ctx.api.getFile(ctx.message.voice.file_id);
  const voiceUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  await supabase.from("problems").insert({
    project_id: worker.project_id,
    reported_by: worker.id,
    voice_url: voiceUrl,
    category: "other",
    description: "Голосовое сообщение",
  });

  await ctx.reply("🎤 Голосовое сообщение передано прорабу.");
});

// --- Helper: complete a task ---
async function completeTask(taskId: string, userId: string) {
  const { data: task } = await supabase
    .from("tasks")
    .select("title, project_id")
    .eq("id", taskId)
    .single();

  await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  await supabase.from("task_updates").insert({
    task_id: taskId,
    user_id: userId,
    update_type: "completed",
  });

  await unlockDependents(taskId);

  // Notify foreman
  if (task) {
    const { data: workerInfo } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();
    if (workerInfo) {
      notifyForeman(task.project_id, workerInfo.name, task.title, "completed");
    }
  }
}

// --- Helper: unlock dependent tasks and notify workers ---
async function unlockDependents(completedTaskId: string) {
  // DB trigger already sets blocked → pending, but we need to send Telegram messages
  const { data: dependents } = await supabase
    .from("tasks")
    .select("*, assignee:users!tasks_assigned_to_fkey(telegram_chat_id)")
    .eq("depends_on", completedTaskId)
    .in("status", ["pending", "blocked"]);

  if (!dependents || dependents.length === 0) return;

  for (const dep of dependents) {
    // Update to sent
    await supabase
      .from("tasks")
      .update({ status: "sent" })
      .eq("id", dep.id);

    await supabase.from("task_updates").insert({
      task_id: dep.id,
      update_type: "unblocked",
    });

    const chatId = (dep as any).assignee?.telegram_chat_id;
    if (!chatId) continue;

    try {
      const { text, keyboard } = unlockMessage({
        title: dep.title,
        location: dep.location,
      });

      const sent = await bot.api.sendMessage(chatId, text, {
        reply_markup: keyboard,
      });

      await supabase
        .from("tasks")
        .update({ telegram_message_id: sent.message_id })
        .eq("id", dep.id);
    } catch (e: any) {
      if (e?.error_code === 403) {
        // Bot blocked by user
        const { data: depWorker } = await supabase
          .from("users")
          .select("id")
          .eq("telegram_chat_id", chatId)
          .single();
        if (depWorker) {
          await supabase
            .from("users")
            .update({ telegram_blocked: true })
            .eq("id", depWorker.id);
        }
      }
      console.error("Failed to send unlock message:", e);
    }
  }
}

// --- Export: send a task to a worker via Telegram ---
export async function sendTaskToWorker(taskId: string) {
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, assignee:users!tasks_assigned_to_fkey(telegram_chat_id, name)"
    )
    .eq("id", taskId)
    .single();

  if (!task) return;

  const chatId = (task as any).assignee?.telegram_chat_id;
  if (!chatId) return;

  try {
    // Check if blocked by dependency
    if (task.depends_on && task.status === "blocked") {
      // Fetch dependency title separately
      const { data: dep } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", task.depends_on)
        .single();
      const depTitle = dep?.title || "задача";
      const { text } = blockedTaskMessage({
        title: task.title,
        dependency_title: depTitle,
      });
      const sent = await bot.api.sendMessage(chatId, text);
      await supabase
        .from("tasks")
        .update({ telegram_message_id: sent.message_id })
        .eq("id", task.id);
    } else {
      const { text, keyboard } = taskMessage(task);
      const sent = await bot.api.sendMessage(chatId, text, {
        reply_markup: keyboard,
      });
      await supabase
        .from("tasks")
        .update({ telegram_message_id: sent.message_id })
        .eq("id", task.id);
    }
  } catch (e: any) {
    if (e?.error_code === 403) {
      await supabase
        .from("users")
        .update({ telegram_blocked: true })
        .eq("telegram_chat_id", chatId);
    }
    console.error("Failed to send task:", e);
  }
}
