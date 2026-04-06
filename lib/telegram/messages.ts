import { InlineKeyboard } from "grammy";

export function taskMessage(task: {
  title: string;
  location?: string | null;
  materials?: string | null;
  safety_notes?: string | null;
  time_estimate_hours?: number | null;
}) {
  let text = `📋 Задача\n\n📌 ${task.title}`;
  if (task.location) text += `\n📍 ${task.location}`;
  if (task.materials) text += `\n🔧 ${task.materials}`;
  if (task.safety_notes) text += `\n⚠️ ${task.safety_notes}`;
  if (task.time_estimate_hours) text += `\n⏱ ~${task.time_estimate_hours}ч`;

  const keyboard = new InlineKeyboard()
    .text("✅ Принял", "confirm")
    .text("❓ Вопрос", "question");

  return { text, keyboard };
}

export function blockedTaskMessage(task: {
  title: string;
  dependency_title: string;
  dependency_assignee?: string | null;
}) {
  const assignee = task.dependency_assignee || "—";
  const text =
    `📋 Запланировано\n\n` +
    `📌 ${task.title}\n` +
    `⏳ Ожидает: ${task.dependency_title} (${assignee})\n\n` +
    `Уведомим когда можно начинать.`;

  return { text };
}

export function unlockMessage(task: {
  title: string;
  location?: string | null;
}) {
  let text = `🔓 Можно начинать!\n\n📌 ${task.title}`;
  if (task.location) text += `\n📍 ${task.location}`;

  const keyboard = new InlineKeyboard()
    .text("✅ Принял", "confirm")
    .text("❓ Вопрос", "question");

  return { text, keyboard };
}

export function photoRequestMessage() {
  return `📸 Отправьте фото выполненной работы.`;
}

export function completedWithPhotoMessage() {
  return `✅ Задача завершена! Фото сохранено.`;
}

export function completedMessage() {
  return `✅ Задача завершена!`;
}

export function reminderMessage(title: string) {
  const keyboard = new InlineKeyboard()
    .text("✅ Готово", "complete")
    .text("🔄 В процессе", "in_progress")
    .text("⚠️ Проблема", "problem");

  return { text: `⏰ ${title}`, keyboard };
}

export function eodMessage(count: number, list: string) {
  const keyboard = new InlineKeyboard()
    .text("✅ Все сделано", "all_done")
    .text("⏳ Перенести", "carry_over");

  return {
    text: `🌆 Незавершённые задачи: ${count}\n${list}`,
    keyboard,
  };
}

export function onboardingMessage() {
  return `Привет! Я AI Bek — бот вашей стройплощадки.\nНапишите ваше имя и фамилию.`;
}

export function onboardingCompleteMessage(name: string, projectName: string) {
  return `✅ ${name}, вы подключены к проекту «${projectName}».\nОжидайте задачи от прораба.`;
}
