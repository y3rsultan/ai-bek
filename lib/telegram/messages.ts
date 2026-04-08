import { InlineKeyboard } from "grammy";

export function taskMessage(task: {
  title: string;
  location?: string | null;
  materials?: string | null;
  safety_notes?: string | null;
  time_estimate_hours?: number | null;
}) {
  let text = `Задача\n\n${task.title}`;
  if (task.location) text += `\nМесто: ${task.location}`;
  if (task.materials) text += `\nМатериалы: ${task.materials}`;
  if (task.safety_notes) text += `\nТБ: ${task.safety_notes}`;
  if (task.time_estimate_hours) text += `\nВремя: ~${task.time_estimate_hours}ч`;

  const keyboard = new InlineKeyboard()
    .text("Принял", "confirm")
    .text("Вопрос", "question");

  return { text, keyboard };
}

export function confirmedMessage(title: string) {
  const keyboard = new InlineKeyboard()
    .text("Готово", "complete")
    .text("Проблема", "problem");

  return {
    text: `Принято: ${title}\n\nКогда закончите, нажмите Готово.`,
    keyboard,
  };
}

export function blockedTaskMessage(task: {
  title: string;
  dependency_title: string;
  dependency_assignee?: string | null;
}) {
  const assignee = task.dependency_assignee || "";
  let text = `Запланировано\n\n${task.title}\nОжидает: ${task.dependency_title}`;
  if (assignee) text += ` (${assignee})`;
  text += `\n\nУведомим когда можно начинать.`;

  return { text };
}

export function unlockMessage(task: {
  title: string;
  location?: string | null;
}) {
  let text = `Можно начинать!\n\n${task.title}`;
  if (task.location) text += `\nМесто: ${task.location}`;

  const keyboard = new InlineKeyboard()
    .text("Принял", "confirm")
    .text("Вопрос", "question");

  return { text, keyboard };
}

export function photoRequestMessage() {
  return `Отправьте фото выполненной работы.`;
}

export function completedWithPhotoMessage() {
  return `Задача завершена! Фото сохранено.`;
}

export function completedMessage() {
  return `Задача завершена!`;
}

export function reminderMessage(title: string) {
  const keyboard = new InlineKeyboard()
    .text("Готово", "complete")
    .text("В процессе", "in_progress")
    .text("Проблема", "problem");

  return { text: `Напоминание: ${title}`, keyboard };
}

export function eodMessage(count: number, list: string) {
  const keyboard = new InlineKeyboard()
    .text("Все сделано", "all_done")
    .text("Перенести", "carry_over");

  return {
    text: `Незавершённые задачи: ${count}\n${list}`,
    keyboard,
  };
}

export function onboardingMessage() {
  return `Привет! Я AI Bek — бот вашей стройплощадки.\nНапишите ваше имя и фамилию.`;
}

export function onboardingCompleteMessage(name: string, projectName: string) {
  return `${name}, вы подключены к проекту «${projectName}».\nОжидайте задачи от прораба.`;
}
