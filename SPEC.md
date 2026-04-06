# AI Bek — Final MVP Spec

*One document. Everything you need. Nothing extra.*

---

## What it is

Voice-powered advanced task manager for construction.
Foreman speaks → AI creates tasks with dependencies → workers get them via Telegram → auto-report replaces hours of manual work.

## Why each role LOVES it

### Рабочий — "Мне больше не надо переспрашивать"
- Gets clear written task in Telegram (no more forgotten verbal instructions)
- One tap to confirm (2 seconds, not a meeting)
- Photo of done work = proof they did it right (protection from blame)
- Voice note to report problems (no calling, no walking to find someone)
- NO app install. NO login. NO training. Just Telegram they already have.

### Бригадир — "Я вижу всю бригаду в одном месте"
- All brigade tasks in one Telegram view
- Workers get written instructions (less "а что мне делать?")
- Photo evidence without walking to every spot
- Problems reported directly in real-time
- Same zero-effort interface as workers

### Прораб — "Я ухожу домой на час раньше"
- Speak the raznaryadka → tasks auto-created (30 sec instead of writing for 10 min)
- Everyone confirms they got it (never again "я не знал")
- Real-time dashboard (stop walking the site to check)
- Dependencies auto-tracked (Task B waits for Task A, sends automatically)
- Daily report writes itself (save 30-120 min/day)

### Зам. директора — "Я знаю что происходит без звонков"
- Live project progress without asking anyone
- Problems appear immediately, not 3 days later
- Time data for better planning

### Директор — "Полная прозрачность без усилий"
- Auto-report every evening in Telegram
- Completion rates, photos, problems — without asking
- Multiple projects visible at once

---

## Tech stack ($0/month for testing)

| What | Service | Free limit |
|------|---------|-----------|
| Frontend PWA | Next.js 14 + Vercel | 100GB bandwidth |
| Database | Supabase PostgreSQL | 500MB |
| Photos | Supabase Storage | 1GB |
| Auth | Supabase Auth | included |
| Bot | grammY + Telegram API | free |
| Voice→text | Groq Whisper | ~30 req/min |
| Text→tasks | Groq Llama 3.1 70B | ~30 req/min |
| i18n | next-intl | open source |
| Offline | Dexie.js | browser-native |

---

## The core loop (this MUST work flawlessly)

```
Foreman speaks → AI creates tasks → Foreman reviews → 
Tasks sent to workers via Telegram → Workers confirm → 
Workers complete + photo → Dependencies auto-unlock → 
Report generates → Director gets summary
```

If this loop works, the MVP succeeds. Everything else is secondary.

---

## Hierarchy & flow (from your 16 respondents)

```
Директор ──reads──→ Auto-report in Telegram (read-only)
    │
Зам. директора ──reads──→ PWA dashboard (read-only)
    │
Прораб / Нач. участка ──uses──→ PWA (creates tasks, voice, reports)
    │ assigns tasks to ↓
Бригадир ──uses──→ Telegram bot (confirm, complete, see brigade)
    │ verbally distributes to ↓
Рабочий ──uses──→ Telegram bot (confirm, complete + photo, report problems)
```

**Key:** Foreman assigns to Бригадир primarily. Individual workers for critical tasks only.

---

## Features in MVP (ranked by importance)

### MUST WORK PERFECTLY (core task manager)
1. Manual task creation (form: title, assignee, location, materials, safety, priority, photo required, dependency)
2. Task assignment & sending via Telegram
3. Worker confirmation (one-tap ✅)
4. Worker completion + photo
5. Task status tracking (draft → sent → confirmed → completed/incomplete)
6. Dependencies (A must finish before B starts, auto-unlock on completion)
7. Dashboard showing all tasks with live status
8. Auto-generated daily report

### MUST WORK WELL
9. Voice-to-task (record → Whisper → Llama → structured tasks → review → send)
10. Problem reporting from workers (voice/photo → foreman alert)
11. Configurable reminders & escalation
12. End-of-day prompt to workers with incomplete tasks
13. Analytics (completion rate, time tracking from timestamps)
14. Team management (add workers, invite links, brigades)
15. Multi-project support

### NICE TO HAVE
16. Offline queue + sync
17. i18n (Kazakh, English — Russian first)
18. Duplicate yesterday's tasks
19. Bulk actions (cancel all, pause all)
20. Photo GPS + timestamp verification

---

## Database

See `database.sql` — paste into Supabase SQL Editor.

Key things already built into the schema:
- **Circular dependency prevention** (database trigger rejects cycles)
- **Auto-unlock** (when task completes, dependent tasks auto-unblock via trigger)
- **Soft deletes** (cancelled status, never hard delete)
- **Time tracking** (task_updates table timestamps every status change)
- **Idempotency** (telegram_message_id on tasks for callback dedup)

---

## Telegram bot messages (copy these exactly)

### Worker receives task (no dependency)
```
📋 Задача

📌 {title}
📍 {location}
🔧 {materials}
⚠️ {safety_notes}
⏱ ~{time_estimate}ч

[✅ Принял]  [❓ Вопрос]
```

### Worker receives task (blocked by dependency)
```
📋 Запланировано

📌 {title}
⏳ Ожидает: {dependency_title} ({dependency_assignee})

Уведомим когда можно начинать.
```

### Dependency resolved — task unlocked
```
🔓 Можно начинать!

📌 {title}
📍 {location}

[✅ Принял]  [❓ Вопрос]
```

### Worker taps "Готово" (photo required)
```
📸 Отправьте фото выполненной работы.
```

### Photo received
```
✅ Задача завершена! Фото сохранено.
```

### Worker taps "Готово" (no photo needed)
```
✅ Задача завершена!
```

### Reminder
```
⏰ {title}
[✅ Готово]  [🔄 В процессе]  [⚠️ Проблема]
```

### End of day
```
🌆 Незавершённые задачи: {count}
{list}
[✅ Все сделано]  [⏳ Перенести]
```

### Onboarding (worker clicks invite link)
```
Привет! Я AI Bek — бот вашей стройплощадки.
Напишите ваше имя и фамилию.
```

### After name entered
```
✅ {name}, вы подключены к проекту «{project_name}».
Ожидайте задачи от прораба.
```

### Daily report (sent to director)
```
📊 AI Bek — {project_name}
📅 {date}

📈 {total} задач → {completed} выполнено ({percent}%)

✅ Выполнено:
{completed_list}

❌ Не выполнено:
{incomplete_list}

⚠️ Проблемы:
{problems_list}

🔄 Перенесено на завтра: {carried_count}
```

---

## Voice-to-task LLM prompt

```
You are AI Bek, a construction site task parser.
Extract tasks from the foreman's speech. Detect dependencies.

Return ONLY valid JSON:
{
  "tasks": [
    {
      "title": "short task name",
      "assignee": "person or brigade name",
      "location": "where on site or null",
      "materials": "needed materials or null",
      "safety_notes": "safety instructions or null",
      "time_estimate_hours": number or null,
      "photo_required": true,
      "priority": "normal",
      "depends_on_index": null
    }
  ]
}

Dependency rules:
- "после", "когда закончат", "потом", "следом" → next task depends on previous
- "параллельно", "одновременно" → no dependency  
- depends_on_index = 0-based index in this array, or null

Rules:
- Vague speech → still create task with what you have
- Unknown assignee → "НЕ НАЗНАЧЕН"
- Extract ALL tasks
- Construction jargon expected
- Mixed Russian/Kazakh/English input accepted
- ONLY valid JSON, no explanation
```

---

## Build order (exact steps)

### Step 0: Setup (30 min)
1. Go to github.com → create repo `ai-bek`
2. Go to supabase.com → create project → copy URL + anon key + service key
3. Go to Telegram → message @BotFather → /newbot → name: AI Bek → save token
4. Go to groq.com → create account → get API key
5. Go to vercel.com → import GitHub repo

### Step 1: Init project
Open Claude (or Cursor) and say:
```
Create a Next.js 14 project with App Router and TypeScript.
Include: Tailwind CSS, @supabase/ssr, grammy, next-intl, dexie.

Set up:
- Supabase client (server + browser)
- Environment variables template
- PWA manifest
- Basic app layout with Russian text
- Folder structure: app/, lib/, components/, bot/

Here's my .env.local template:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=
```

### Step 2: Database
Paste `database.sql` into Supabase SQL Editor. Run it.
Create storage bucket "photos" (private, 5MB limit, jpeg/png/webp).

### Step 3: Build manual task creation FIRST
```
Build the foreman's task creation form and dashboard.
NO voice yet. Just manual form input.

Task form fields:
- title (required)
- assignee (dropdown from team members)
- location
- materials  
- safety_notes
- priority (high/normal/low)
- photo_required (toggle, default on)
- time_estimate_hours
- depends_on (dropdown from today's other tasks)
- category

Dashboard shows today's tasks as cards:
- Color by status (gray=draft, blue=sent, yellow=confirmed, green=completed, red=incomplete, orange=problem)
- Each card: title, assignee, status badge, time
- Stats bar: total | completed | in progress | blocked | incomplete
- "Отправить задачи" button

Here's the database schema for tasks and task_updates:
[paste from database.sql]
```

### Step 4: Build Telegram bot
```
Build the Telegram bot webhook handler.
Library: grammy (webhook mode on Vercel API route /api/telegram).

Flows to implement:
1. /start with invite_code → worker registration
2. Receive task message with inline keyboard [✅ Принял] [❓ Вопрос]
3. Callback: confirmed → update task status, create task_update
4. Worker sends text "готово" or taps complete → ask for photo if required
5. Worker sends photo → save to Supabase Storage, update task
6. CRITICAL: When task completes, check if other tasks depend on it.
   If yes, send unlock message to those workers.
7. Worker sends unexpected text → ask if it's a problem report
8. Worker sends voice note → save as problem, alert foreman

Edge cases to handle:
- Button clicked twice (check if already processed)
- Old button from previous day (check task.due_date)
- Worker blocked the bot (catch 403, mark user)
- Photo upload fails (retry 3x, save completion without photo)
- Duplicate webhook (track update_id)

Here are the exact message templates:
[paste Telegram messages from above]

Here's the database schema:
[paste relevant tables]
```

### Step 5: Connect dashboard to bot
```
When foreman taps "Отправить задачи":
1. Get all tasks with status='draft' for today
2. For each task:
   a. If task has depends_on AND that dependency is NOT completed:
      → set status='blocked', send "blocked" message to worker
   b. If no dependency or dependency already completed:  
      → set status='sent', send task message to worker
3. Update dashboard in real-time (Supabase realtime subscription)

When worker confirms/completes in Telegram:
→ Dashboard auto-updates (Supabase realtime)

When task completes and has dependents:
→ Database trigger auto-unblocks them
→ Bot sends unlock message to dependent workers
→ Dashboard shows them as 'pending' now
```

### Step 6: Voice-to-task
```
Add voice recording to the foreman's PWA.

1. Big microphone button on dashboard
2. Hold to record (MediaRecorder API, WebM format)
3. 3-minute limit with visible timer
4. On release: show "Обработка..."
5. Send audio to /api/voice:
   a. Forward to Groq Whisper → get transcription
   b. Forward transcription to Groq Llama with this prompt:
   [paste LLM prompt from above]
   c. Parse JSON response
   d. Return structured tasks
6. Display as editable task cards
7. Foreman reviews, edits any field, adds/removes dependencies
8. Taps confirm → tasks saved to database
9. Fallback: if API fails, show transcription text + manual form

Edge cases:
- No mic permission → show instructions, hide mic button
- Silent recording → "Речь не обнаружена"
- Whisper returns empty → show retry + manual fallback
- LLM returns invalid JSON → retry once, then show transcription for manual entry
- No internet → save audio to IndexedDB, process later
- Assignee not in team → show as unmatched, foreman picks from dropdown
```

### Step 7: Auto-report
```
Build auto daily report generation.

Triggered by: foreman taps "Сформировать отчёт" or scheduled at EOD time.

Report includes:
- Date, project name
- Stats: total tasks, completed count, completion %
- List of completed tasks (title, assignee, time taken)  
- List of incomplete tasks (title, assignee, reason if given)
- List of problems reported (time, reporter, description)
- Count of tasks carried to tomorrow
- Time tracking: average actual vs estimated

Send to: Telegram group/channel (director configured in settings)
Also show in: PWA reports page

Format: plain text Telegram message (use the template from messages section)
```

### Step 8: Reminders & escalation
```
Build configurable reminder system.

Foreman sets in project settings:
- reminder_frequency_min (0 = off, 60, 120, etc.)
- eod_prompt_time ("16:30")

Implementation:
- Vercel Cron job runs every 30 minutes
- Checks: which tasks are sent/confirmed but not completed?
- If time since last reminder > frequency → send reminder via bot
- At EOD time → send end-of-day prompt to all workers with incomplete tasks
- After 2 reminders with no response → create escalation task_update, alert foreman

CRITICAL: Use idempotency. Check if reminder already sent today for this task.
CRITICAL: Vercel cron can double-fire. Check before processing.
CRITICAL: Keep Supabase alive — add a daily ping in the cron job.
```

### Step 9: Polish
- Offline caching (Dexie.js for tasks, service worker for app shell)
- Photo compression (canvas resize, JPEG quality 60%, max 1200px wide)  
- i18n setup (Russian first, add Kazakh/English translations)
- Brigadier /brigade command (list all brigade tasks)
- Error states, loading states, empty states everywhere
- Mobile testing on real Android phone

### Step 10: Team test
- Assign: 1 foreman, 1 director, 1 brigadier, 2 workers
- Run simulated construction day 3 times
- Test: create tasks via voice → send → confirm → complete → report
- Test: dependency chain (3 tasks, A→B→C)
- Test: problem reporting
- Test: what breaks?

---

## Edge cases

See `edge_cases.md` for the complete 130-case bible.
The 🔴 CRITICAL ones that MUST be handled before any real testing:

1. **Manual task creation works without ANY API** (voice is enhancement, not requirement)
2. **Telegram inline button pressed twice** → idempotency check, don't double-process
3. **Telegram webhook received twice** → track update_id, skip duplicates  
4. **Circular dependency** → database trigger rejects it (already in schema)
5. **Task completes but Telegram send fails for dependent** → DB updates first, Telegram retries separately
6. **LLM returns invalid JSON** → retry once, then fallback to manual
7. **Voice recording lost** → save to IndexedDB before upload attempt
8. **Supabase pauses after 7 days inactive** → daily cron ping keeps it alive
9. **Worker blocks bot** → catch 403, mark user, alert foreman
10. **SQL injection / XSS** → Supabase parameterized queries + React auto-escaping

---

## File structure

```
ai-bek/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx          (app shell, auth check)
│   │   ├── page.tsx            (dashboard — today view)
│   │   ├── tasks/
│   │   │   ├── new/page.tsx    (create task — manual form)
│   │   │   └── [id]/page.tsx   (task detail view)
│   │   ├── voice/page.tsx      (voice recording + AI parsing)
│   │   ├── team/page.tsx       (manage workers, invite links)
│   │   ├── reports/page.tsx    (daily/weekly/monthly reports)
│   │   ├── settings/page.tsx   (project settings)
│   │   └── login/page.tsx      (auth page)
│   └── api/
│       ├── telegram/route.ts   (webhook handler)
│       ├── voice/route.ts      (audio → Whisper → text)
│       ├── parse/route.ts      (text → Llama → tasks JSON)
│       ├── report/route.ts     (generate daily report)
│       └── cron/route.ts       (reminders, EOD prompts, keep-alive)
├── lib/
│   ├── supabase/
│   │   ├── server.ts           (server-side client)
│   │   └── browser.ts          (browser-side client)
│   ├── telegram/
│   │   ├── bot.ts              (grammY bot instance)
│   │   ├── messages.ts         (all message templates)
│   │   └── handlers.ts         (callback handlers)
│   ├── groq/
│   │   ├── whisper.ts          (voice → text)
│   │   └── parser.ts           (text → structured tasks)
│   ├── tasks/
│   │   ├── actions.ts          (create, send, complete, etc.)
│   │   └── dependencies.ts     (resolve, check blocked, unlock)
│   ├── reports/
│   │   └── generate.ts         (build report from day's data)
│   └── db.ts                   (Dexie.js offline store)
├── components/
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── VoiceRecorder.tsx
│   ├── Dashboard.tsx
│   ├── StatusBadge.tsx
│   └── StatsBar.tsx
├── messages/
│   ├── ru.json                 (Russian translations)
│   ├── kk.json                 (Kazakh translations)
│   └── en.json                 (English translations)
├── public/
│   ├── manifest.json           (PWA manifest)
│   └── icons/                  (app icons)
├── database.sql                (paste into Supabase)
├── edge_cases.md               (130 edge cases with mitigations)
└── .env.local.example
```

---

## Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAxxxxx

# Groq
GROQ_API_KEY=gsk_xxxxx

# App
NEXT_PUBLIC_APP_URL=https://ai-bek.vercel.app
```

---

## One last thing

Don't try to build everything at once. Follow the step order exactly.
The first thing a real foreman will test is: "can I create a task and see it on my dashboard?" 
If that feels fast and clean, they'll try voice.
If voice works, they'll send tasks to workers.
If workers respond, the loop is proven.
If the loop works, the report writes itself.

Everything builds on the step before it. Don't skip ahead.
