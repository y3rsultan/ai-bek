# AI Bek — Complete Edge Case Bible

Every possible, potential, and situational edge case with mitigation.
Organized by system component. Each case has a severity rating and a concrete solution.

Severity: 🔴 CRITICAL (app breaks/data loss) | 🟡 HIGH (bad UX, user gets stuck) | 🟢 MEDIUM (annoying but recoverable) | ⚪ LOW (cosmetic or rare)

---

## A. VOICE RECORDING (Foreman records task in PWA)

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| A1 | Microphone permission denied by browser | 🔴 | Detect PermissionDeniedError. Show clear instruction: "Разрешите доступ к микрофону в настройках браузера" with a visual guide. Offer manual text input as fallback. |
| A2 | Device has no microphone (rare desktop) | 🟡 | Check navigator.mediaDevices before showing mic button. If unavailable, hide voice button, show only manual task creation. |
| A3 | Recording too short (< 1 second, accidental tap) | 🟢 | Discard recordings under 1.5 seconds. Show: "Слишком короткая запись. Попробуйте снова." |
| A4 | Recording too long (foreman talks 10+ minutes) | 🟡 | Hard limit: 3 minutes. Show countdown timer. At 2:45 show warning pulse. At 3:00 auto-stop and process what was captured. Allow sequential recordings. |
| A5 | Extreme background noise (construction site) | 🟡 | Whisper handles noise well, but show transcription preview BEFORE parsing. Let foreman correct transcription if garbled. Add "Переслушать" button to replay recording. |
| A6 | Multiple speakers talking over foreman | 🟢 | Whisper picks up dominant speaker. Show transcription for review. If garbled, prompt: "Не удалось разобрать. Попробуйте записать в тихом месте." |
| A7 | Foreman coughs/pauses mid-recording | ⚪ | Whisper handles natural pauses. No action needed. |
| A8 | Phone call interrupts recording | 🟡 | MediaRecorder fires 'pause' or 'stop' event on interruption. Save what was recorded. Show: "Запись прервана. Использовать записанное или начать заново?" with both options. |
| A9 | App goes to background during recording | 🟡 | Same as A8. Some browsers stop MediaRecorder on background. Save partial recording. Offer resume or retry. |
| A10 | Browser doesn't support MediaRecorder | 🔴 | Check for MediaRecorder API on app load. If absent: hide voice feature entirely, show only manual creation. Affected: very old Android WebViews (pre-Chrome 49). Show: "Ваш браузер не поддерживает запись. Обновите Chrome." |
| A11 | Audio format incompatible with Whisper | 🟢 | MediaRecorder outputs WebM (Opus) or OGG. Whisper accepts both. If edge case format: convert server-side with ffmpeg before sending to Whisper. |
| A12 | Audio file too large to upload (slow network) | 🟡 | 3 min of audio ≈ 1-3MB. Show upload progress bar. If upload fails, save to IndexedDB and retry on better connection. Show: "Сохранено. Отправим когда будет интернет." |
| A13 | Upload interrupted by network loss | 🔴 | Save audio blob to IndexedDB immediately after recording stops (before upload attempt). Retry upload on reconnect. Never lose the recording. |
| A14 | Silent recording (mic on but no speech) | 🟢 | Whisper returns empty string. Detect empty transcription. Show: "Речь не обнаружена. Попробуйте снова." |
| A15 | Foreman records in unsupported language | 🟢 | Whisper supports 97 languages. For truly unsupported: transcription will be garbled. Show transcription preview so foreman can see it's wrong and switch to manual. |
| A16 | Code-switching mid-sentence (RU/KK/EN mixed) | 🟢 | Whisper handles code-switching. LLM prompt explicitly accepts mixed language. Test during Phase 3 with real mixed speech. |
| A17 | Heavy dialect or accent | 🟢 | Whisper is trained on diverse accents. Show transcription preview. If consistently wrong for a user, they'll learn to speak clearer or use manual input. |
| A18 | Foreman speaks very fast | 🟢 | Whisper handles fast speech. Transcription preview lets foreman verify. |
| A19 | Construction jargon / abbreviations | 🟡 | LLM prompt tells it to expect construction terminology. For site-specific abbreviations: foreman reviews and corrects in task cards. Over time, consider a project glossary (v2). |

---

## B. AI/LLM PROCESSING (Whisper + Llama)

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| B1 | Whisper API returns empty transcription | 🟡 | Detect empty response. Show: "Не удалось распознать речь. Попробуйте снова или введите вручную." Offer manual input. |
| B2 | Whisper API timeout (> 30 seconds) | 🟡 | Set 30s timeout. On timeout: "Обработка занимает слишком долго. Попробуйте снова или введите вручную." Keep audio in IndexedDB for retry. |
| B3 | Whisper returns garbled/incorrect text | 🟡 | ALWAYS show transcription preview before parsing. Foreman can edit transcription text, then re-parse. Or switch to manual. |
| B4 | LLM returns invalid JSON | 🔴 | Wrap JSON.parse in try-catch. On failure: retry once with stronger prompt ("Return ONLY valid JSON, nothing else"). If still fails: show raw transcription and let foreman create tasks manually from it. |
| B5 | LLM returns empty task array | 🟡 | Detect empty array. Show: "Задачи не обнаружены в записи. Попробуйте снова или добавьте вручную." Show transcription as reference. |
| B6 | LLM returns tasks with missing required fields | 🟡 | Validate every task object. Fill defaults: title="Без названия", assignee="НЕ НАЗНАЧЕН", priority="normal". Show cards with missing fields highlighted in yellow for foreman to fill. |
| B7 | LLM hallucinates tasks not mentioned | 🟢 | ALWAYS show editable preview. Foreman deletes phantom tasks. Show transcription alongside cards so foreman can cross-check. |
| B8 | LLM misidentifies assignee names | 🟡 | Show assignee as editable dropdown populated from project's team list. If LLM's name is close but not exact (e.g., "Серик" vs "Серік"), fuzzy-match to closest team member. Highlight uncertain matches. |
| B9 | LLM creates false dependency | 🟢 | Show detected dependencies clearly. Foreman removes with one tap. Dependencies are suggestions, not auto-applied. |
| B10 | LLM misses a real dependency | 🟢 | Foreman adds dependency manually via dropdown in task card. |
| B11 | LLM misinterprets safety note as separate task | 🟢 | Foreman deletes extra card or merges info into the correct task by editing. |
| B12 | Groq API rate limited (free tier) | 🟡 | Catch 429 status. Show: "Сервис перегружен. Повторите через минуту." Implement exponential backoff with max 3 retries. For testing with 5 people, unlikely to hit limits. |
| B13 | Groq API completely down | 🔴 | Catch all API errors. Show: "Сервис временно недоступен. Создайте задачи вручную." Manual task creation must work WITHOUT any API dependency. Voice is an enhancement, not a requirement. |
| B14 | LLM returns assignee not in team list | 🟡 | Show as unmatched (red highlight) in task card. Foreman selects correct person from dropdown. Optionally: "Добавить [name] в команду?" |
| B15 | LLM returns duplicate tasks from same recording | 🟢 | Detect tasks with >90% similar titles. Show warning: "Возможный дубликат" on the card. Foreman deletes if duplicate. |
| B16 | Transcription correct but LLM parsing fails | 🟡 | Show transcription text below the error message. Foreman can copy text and create tasks manually, or retry parsing. |
| B17 | LLM response exceeds token limit | 🟢 | Set max_tokens to 2000 (enough for ~15 tasks). If truncated: parse what's valid, show a warning "Распознано N задач, возможно не все" |
| B18 | Very long transcription (from 3-min recording) | 🟢 | Long text = more tasks = higher chance of parsing issues. Process normally but set LLM max_tokens higher (3000). Show all results for review. |

---

## C. TELEGRAM BOT (Worker-facing)

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| C1 | Worker blocks the bot | 🟡 | Telegram returns 403 "bot was blocked by the user" on sendMessage. Catch this error. Mark worker as `telegram_blocked=true` in DB. Alert foreman: "⚠️ [Имя] заблокировал бота." Foreman handles offline. |
| C2 | Worker deletes chat with bot | 🟢 | Bot can still send messages (chat isn't deleted server-side). But history is lost on worker's device. No action needed. |
| C3 | Worker's Telegram account deleted | 🟡 | sendMessage returns error. Mark worker inactive. Alert foreman. |
| C4 | Worker changes Telegram username | ⚪ | We store chat_id (permanent), not username. No impact. |
| C5 | Worker uses Telegram on multiple devices | ⚪ | Telegram syncs across devices. All messages/buttons work everywhere. No issue. |
| C6 | Two workers share one phone/Telegram | 🟡 | Each Telegram account has a unique chat_id. If they literally share one Telegram account: both get same messages. Solution: flag this in onboarding — require unique Telegram accounts. Show error if chat_id already registered to another worker. |
| C7 | Bot message exceeds Telegram 4096 char limit | 🟡 | If task description is very long: truncate message at 3800 chars, add "... [Полное описание в приложении]". Split into multiple messages only if absolutely necessary. |
| C8 | Telegram API rate limited (30 msg/sec) | 🟡 | Queue outgoing messages with 35ms delay between sends. For 50 workers getting morning tasks: ~2 seconds total. Use a proper queue (array + setInterval). |
| C9 | Telegram API down | 🔴 | Catch all sendMessage errors. Queue failed messages for retry (save to DB with status='pending_send'). Run retry job every 5 minutes. Alert foreman: "Некоторые сообщения не доставлены. Повторяем отправку." |
| C10 | Vercel cold start delays webhook response | 🟡 | Telegram retries webhooks after timeout. Set webhook timeout to 60s. Keep functions warm with periodic pings if needed. Respond with 200 immediately, process async. |
| C11 | Worker sends sticker/GIF/animation | 🟢 | Bot receives update with sticker/animation type. Respond: "Я понимаю только текст, фото и голосовые сообщения." Ignore the sticker. |
| C12 | Worker sends document instead of photo | 🟢 | Check message type. If document (PDF, etc.): "Пожалуйста, отправьте фото, не документ." If document is an image file: extract and process it. |
| C13 | Worker sends video instead of photo | 🟢 | "Пожалуйста, отправьте фото. Видео пока не поддерживается." |
| C14 | Worker sends contact/location/poll | 🟢 | "Я понимаю только текст, фото и голосовые." Ignore. |
| C15 | Worker sends forwarded message | 🟢 | Process as normal text/photo. Forwarded flag is metadata only. |
| C16 | Worker clicks inline button twice rapidly | 🔴 | Use callback_query answer immediately (answerCallbackQuery). Use idempotency: before processing, check if this task_update already exists. If duplicate: respond "Уже учтено ✅" but don't create duplicate record. |
| C17 | Worker clicks button from yesterday's message | 🟡 | Check task's due_date and status. If task is from a previous day and already closed: "Эта задача уже закрыта. Обратитесь к прорабу." If task is still active (carried over): process normally. |
| C18 | Worker sends message while bot processes previous | 🟢 | Webhooks are processed sequentially per chat by Telegram. Messages queue naturally. No race condition. |
| C19 | /start without invite code | 🟡 | User sends just /start with no payload. Respond: "Привет! Для регистрации нужна ссылка-приглашение от вашего прораба. Попросите её у него." |
| C20 | /start with invalid/expired invite code | 🟡 | Look up invite_code in DB. If not found: "Ссылка недействительна. Попросите прораба создать новую." |
| C21 | /start with code already used by another worker | 🟡 | Each invite_code is unique per user, not per use. If the user row already has a telegram_chat_id set: "Это приглашение уже использовано. Попросите прораба создать новое для вас." |
| C22 | Same worker tries /start again (already registered) | 🟢 | Check if chat_id already linked to a user. If yes: "Вы уже зарегистрированы в проекте [name]. Используйте бота для работы с задачами." |
| C23 | Worker in project A clicks invite for project B | 🟡 | Allow it. Update worker's project_id to new project. Warn: "Вы перенесены в проект [new project]. Ваши задачи из предыдущего проекта больше не активны." |
| C24 | Invite link shared publicly (unintended person joins) | 🟡 | Invite codes are per-user. Foreman creates a specific code for a specific worker name. If stranger uses it: they register under that worker's name. Foreman sees unknown person in team list and can deactivate. Add "Подтвердите: вы [Name]?" step in onboarding. |
| C25 | Bot receives message from group chat | 🟢 | Ignore all non-private messages. Bot should be set to not receive group messages (BotFather → disable "Allow Groups"). If received: silently ignore, don't respond. |
| C26 | Telegram sends duplicate webhook (retry on timeout) | 🔴 | Use update_id to deduplicate. Track last processed update_id. Skip already-processed updates. This is critical — duplicates can cause double task completions. |
| C27 | Worker sends voice note outside problem context | 🟢 | Any unexpected voice note: treat as potential problem report. Ask: "Вы сообщаете о проблеме? [Да] [Нет, ошибка]" |
| C28 | Worker asks bot a question it can't answer | 🟢 | If text doesn't match any expected flow: "Я могу помочь с задачами. Используйте кнопки для управления задачами или отправьте сообщение/фото чтобы сообщить о проблеме." |
| C29 | Worker sends angry/abusive message | ⚪ | Bot doesn't judge. If no task context: treat as general message, ask if it's a problem report. Log the message. |
| C30 | Worker sends photo without active task requiring photo | 🟢 | If no task awaiting photo: "У вас нет задач, ожидающих фото. Это проблема на объекте? [Да] [Нет]" |
| C31 | Worker sends photo for wrong task (has multiple) | 🟡 | If worker has multiple tasks: ask which task the photo is for. Show numbered list: "[1] Опалубка [2] Кабели. Для какой задачи это фото?" |
| C32 | Photo file too large (Telegram max 20MB) | 🟢 | Telegram handles compression for photos (not documents). If sent as document: ask to resend as photo. Bot downloads compressed version. |
| C33 | Photo download from Telegram servers fails | 🟡 | Retry download 3 times with exponential backoff. If still fails: save task_update with note "фото не загружено" and alert foreman. |
| C34 | Worker sends photo but Supabase storage upload fails | 🟡 | Save photo temporarily to /tmp. Queue retry. If persistent failure: save task completion without photo, flag for foreman: "Фото не сохранено, проверьте вручную." |
| C35 | Worker tries to complete task not assigned to them | 🟢 | Check assigned_to before processing. If mismatch: "Эта задача назначена другому. Обратитесь к прорабу." |

---

## D. TASK LIFECYCLE

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| D1 | Task created but never sent (draft forever) | 🟡 | Dashboard shows draft count prominently. Daily reminder at configured time: "У вас [N] задач в черновиках." Auto-expire drafts after 7 days with notification. |
| D2 | Task sent but worker never confirms | 🟡 | Reminder system (foreman-configurable). After max reminders: alert foreman "⚠️ [Name] не подтвердил задачу." Foreman decides: call, reassign, or wait. |
| D3 | Task confirmed but never completed | 🟡 | End-of-day prompt. If still incomplete next morning: show as "Перенесено" in dashboard. |
| D4 | Worker marks complete without photo (when required) | 🟢 | Bot ALWAYS asks for photo if photo_required=true. Task stays in "awaiting_photo" state until photo received. Worker sees: "Задача отмечена. Отправьте фото для подтверждения." |
| D5 | Worker taps "complete" twice | 🔴 | Idempotency check: if task.status already 'completed', respond "Уже отмечено ✅" and don't create duplicate update. |
| D6 | Task reassigned while worker is mid-progress | 🟡 | When foreman reassigns: old worker gets "ℹ️ Задача [title] передана другому работнику." New worker gets normal task message. Old worker's partial updates preserved in history. |
| D7 | Task deleted while worker has active assignment | 🟡 | Worker gets: "ℹ️ Задача [title] отменена прорабом." Task marked as 'cancelled' (not actually deleted — soft delete). |
| D8 | Task edited after being sent (title changed) | 🟢 | Worker gets update message: "📝 Задача обновлена: [new title]." Only send update for material changes (title, location, materials), not minor edits. |
| D9 | Task due date passes without completion | 🟢 | End-of-day prompt handles this. Next day: task shows as "overdue" in red on dashboard. |
| D10 | Task carried over 3+ days | 🟡 | After 3 days incomplete: special flag "⚠️ Хроническая задержка" in dashboard. Foreman must actively decide: carry over again, cancel, or reassign. Don't let tasks silently persist forever. |
| D11 | Task created for unconnected worker (no Telegram) | 🟡 | Allow creation. Show warning: "⚠️ [Name] не подключен к Telegram. Задача создана, но не отправлена." Show invite link for that worker prominently. |
| D12 | Task for deactivated worker | 🟢 | Prevent assignment to deactivated workers. Dropdown only shows active workers. If someone deactivated after assignment: alert foreman, prompt reassignment. |
| D13 | Task assigned to worker on different project | 🔴 | Backend validation: assigned_to.project_id must match task.project_id. Reject with error. UI dropdown only shows workers in current project. |
| D14 | Task with no assignee | 🟢 | Allow saving as draft. Block sending: "Выберите исполнителя перед отправкой." |
| D15 | Two identical task titles for same worker | ⚪ | Allow it — construction often has repeated task types. Each task has unique ID. In Telegram: include location to differentiate: "Опалубка (3 этаж B)" vs "Опалубка (4 этаж A)". |
| D16 | 15+ tasks for one worker in one day | 🟢 | Allow it. Telegram sends them as a numbered summary message instead of 15 separate messages. "📋 Задачи на сегодня (15):" with compact list and individual buttons. |
| D17 | Task created for past date | 🟢 | Allow it (for logging retroactive work). Show warning: "Дата в прошлом. Вы уверены?" |
| D18 | Task created for far future date | ⚪ | Allow it. No special handling needed. Won't be sent until that date. |
| D19 | Task created at 2 AM (off-hours) | ⚪ | Allow it. Tasks aren't sent until foreman presses "Отправить". Time of creation doesn't matter. |
| D20 | Very long task title (200+ chars) | 🟢 | Truncate display in Telegram at 100 chars with "...". Full title in task detail view. Database column: no char limit (text type). |
| D21 | Emojis in task title | ⚪ | Allow. PostgreSQL handles UTF-8. Telegram renders natively. No issue. |
| D22 | Task description with SQL/XSS injection content | 🔴 | Supabase parameterized queries prevent SQL injection. React auto-escapes HTML in JSX. Telegram API auto-escapes. Never use dangerouslySetInnerHTML with user content. |

---

## E. DEPENDENCIES

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| E1 | Circular dependency: A→B→C→A | 🔴 | Before saving any dependency, run cycle detection (DFS/BFS from the new dependency target back through the chain). If cycle found: reject with "Циклическая зависимость обнаружена. Задача [X] уже зависит от [Y]." |
| E2 | Self-dependency: A depends on A | 🔴 | Simple check: if depends_on === task.id, reject. "Задача не может зависеть от самой себя." |
| E3 | Dependency on task from different project | 🔴 | Backend validation: both tasks must share project_id. UI dropdown only shows tasks from current project. |
| E4 | Dependency on already-completed task | 🟢 | Allow setting it, but immediately resolve: dependent task status = 'pending' (not blocked). The dependency exists for documentation but doesn't block. |
| E5 | Dependency on cancelled task | 🟡 | Auto-unblock dependent. Notify foreman: "Задача [parent] отменена. [child] разблокирована автоматически." |
| E6 | Very deep chain (A→B→C→D→E→F, 5+ deep) | 🟢 | Allow it. Each completion triggers next unlock. No recursion needed — each task only knows its immediate predecessor. Webhook fires per completion. |
| E7 | Diamond: A→B, A→C, B→D, C→D | 🟡 | Task D has depends_on pointing to ONE task only (schema limitation — single foreign key). For MVP: only single-predecessor dependencies. Document this limitation. If D needs both B and C: foreman creates D depending on whichever finishes last (their judgment call). V2: add many-to-many dependency table. |
| E8 | Removing dependency after tasks sent | 🟢 | If dependent task was blocked: unblock immediately, send to worker. If already sent: no change needed. |
| E9 | Adding dependency to in-progress task | 🟡 | If new predecessor is already completed: no blocking. If not completed: change dependent task to 'blocked', notify worker: "⏳ Задача [title] теперь ожидает завершения [parent]." |
| E10 | Dependency on task assigned to departed worker | 🟡 | Predecessor task is stuck. Alert foreman: "⚠️ Задача [parent] назначена на неактивного работника. Переназначьте для разблокировки [child]." |
| E11 | No root task in chain (all blocked) | 🟡 | Detect on send: if all tasks in a dependency group have predecessors but no task has depends_on=null, show: "⚠️ Нет начальной задачи. Одна задача должна быть без зависимости." |
| E12 | Predecessor completed with "problem" status | 🟡 | Don't auto-unlock. Foreman must explicitly decide: "Задача [parent] завершена с проблемой. Разблокировать [child]? [Да] [Нет]" |
| E13 | Foreman manually unblocks task (override) | 🟢 | Allow. Add "Разблокировать вручную" button. Creates task_update(type='unblocked', content='manual override'). Task proceeds normally. |
| E14 | Auto-unlock webhook fails (Telegram down) | 🔴 | Separate the DB update from Telegram send. First: update task status to 'pending' in DB. Then: attempt Telegram send. If send fails: queue for retry (see C9). Dashboard shows task as unblocked regardless of Telegram delivery. |
| E15 | Dependency removed but was actually needed | ⚪ | No technical mitigation. This is a human judgment error. The system shows dependency history in task_updates for traceability. |

---

## F. USER MANAGEMENT

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| F1 | Foreman account deleted/deactivated | 🔴 | Prevent deletion if project has active tasks. Require: transfer project ownership to another foreman first, or archive all tasks. |
| F2 | Duplicate worker names (two "Серик") | 🟡 | Allow duplicate names. Use unique IDs everywhere. In UI: show "Серик (Бригада 1)" vs "Серик (Бригада 2)". In Telegram: include last name initial or brigade. |
| F3 | Worker changes name after registration | 🟢 | Foreman can edit worker name in team management. Bot greeting doesn't change (uses current DB name). |
| F4 | Worker joins wrong project | 🟡 | Onboarding confirmation step: "Вы присоединяетесь к проекту [Project Name]. Верно? [Да] [Нет, ошибка]" |
| F5 | Foreman deactivates worker with active tasks | 🟡 | Show warning: "[Name] имеет [N] активных задач. Деактивировать? Задачи будут отмечены для переназначения." Upon confirmation: mark tasks as 'unassigned', show in dashboard. |
| F6 | Foreman changes worker's brigade mid-project | 🟢 | Allow. Active tasks stay assigned to the worker regardless of brigade. Brigade is for grouping/visibility only. |
| F7 | Brigadier leaves, brigade has no lead | 🟢 | Brigade still functions (it's just a group). Foreman assigns new brigadier when ready. |
| F8 | Phone number shared between users | ⚪ | Phone is optional in our schema. We use Telegram chat_id for uniqueness. No conflict. |
| F9 | User has no Telegram username | ⚪ | We use chat_id, not username. Username is just display metadata. |
| F10 | Telegram display name ≠ registered name | 🟢 | We use the name from registration, not Telegram profile. No confusion in dashboard. |
| F11 | Max users on free tier | 🟡 | Supabase free: 50K MAU. Not an issue for testing. For pilot: monitor usage. |
| F12 | Foreman accidentally deactivates themselves | 🟢 | Prevent self-deactivation. Button greyed out with tooltip: "Нельзя деактивировать свой аккаунт." |

---

## G. DATA & STORAGE

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| G1 | Database (500MB) fills up | 🟡 | Monitor with Supabase dashboard. At 80% capacity: alert. For testing: won't be an issue. For pilot: upgrade to Pro ($25/mo). Implement data retention: archive tasks older than 90 days. |
| G2 | Photo storage (1GB) fills up | 🟡 | Client-side compression: resize to max 1200px wide, JPEG quality 60%, target ~150-200KB per photo. At 200KB avg: ~5,000 photos. Monitor usage. For pilot: upgrade. |
| G3 | Photo compression fails (corrupt image) | 🟢 | Canvas-based compression can fail on certain formats. Try-catch. On failure: upload original (larger) with warning. If that fails too: save task completion without photo, flag for foreman. |
| G4 | Photo upload succeeds but DB record fails | 🟡 | Order of operations: 1) Upload photo to storage 2) Get URL 3) Create DB record. If step 3 fails: orphaned photo in storage. Clean up with periodic job that removes unreferenced photos. |
| G5 | DB record succeeds but photo upload fails | 🟡 | Order of operations prevents this (upload first). If using transaction: rollback DB on upload failure. Show: "Фото не загружено. Попробуйте отправить снова." |
| G6 | Concurrent writes to same task | 🟡 | Two foremen update same task simultaneously. Supabase uses PostgreSQL with default isolation. Last write wins. For MVP: acceptable. V2: add optimistic locking (version column + conflict detection). |
| G7 | Database migration breaks existing data | 🔴 | Always use non-destructive migrations: ADD COLUMN with DEFAULT, never DROP COLUMN in production. Test migrations on Supabase branch database first (Pro feature) or local copy. |
| G8 | Supabase down / maintenance | 🔴 | Entire app depends on Supabase. Offline mode (IndexedDB) covers read access. Write operations queue locally and sync on recovery. Show: "Сервер временно недоступен. Данные сохранены локально." |
| G9 | Supabase free tier pauses after 7 days inactivity | 🔴 | Supabase pauses inactive free projects. Set up a cron job (Vercel cron) that pings Supabase daily to keep it active. This is essential. |
| G10 | Old tasks accumulate indefinitely | 🟢 | Don't delete. Archive: tasks older than 90 days moved to 'archived' status, excluded from dashboard queries. Available in reports. |
| G11 | Performance degrades with thousands of tasks | 🟢 | Indexes defined in schema handle this. Dashboard queries filter by project_id + due_date + status. Pagination: show last 7 days by default, load more on scroll. |
| G12 | Realtime subscription disconnects | 🟢 | Supabase client auto-reconnects. Add onDisconnect handler to show "Потеряно соединение..." banner. On reconnect: refresh data. |

---

## H. NETWORK & CONNECTIVITY

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| H1 | Complete internet loss during voice upload | 🔴 | Save audio blob to IndexedDB BEFORE upload attempt. On reconnect: auto-retry upload. Show: "Сохранено offline. Обработаем при подключении к интернету." |
| H2 | Slow connection (3G, rural Kazakhstan) | 🟡 | Minimize payload sizes. Compress photos aggressively. Voice files: 3 min audio ≈ 1-3MB which is fine on 3G (~30 seconds upload). Show progress indicators for all uploads. |
| H3 | Connection drops mid-completion flow | 🟡 | Worker tapped "Complete" but photo upload fails. Save completion intent locally (Telegram). Photo stays on phone. Bot retries: "Фото не отправлено. Попробуйте снова." |
| H4 | PWA loaded offline, foreman tries to create task | 🟡 | Allow task creation in IndexedDB. Show yellow banner: "Офлайн-режим. Задачи сохранены локально." On reconnect: sync all local tasks to Supabase. Show sync status. |
| H5 | Offline tasks conflict with server data | 🟢 | Use timestamps. Offline tasks have created_at from device clock. On sync: if server has newer version (concurrent edit by another foreman), show conflict resolution: "Задача изменена на сервере. Использовать вашу версию или серверную?" |
| H6 | Worker has internet but Telegram unreachable | 🟢 | Telegram handles retry. Messages queue on their servers. Worker gets them when Telegram reconnects. No action from us. |
| H7 | VPN/firewall blocking Telegram | 🟢 | Not common in Kazakhstan. If happens: this is a worker's network issue. No mitigation from our side. |
| H8 | Multiple offline actions applied in wrong order | 🟡 | Queue offline actions with sequential timestamps. Apply in order on sync. If an action references a task that was deleted (by another user while offline): skip and notify. |
| H9 | Service worker caches stale version of app | 🟢 | Implement proper cache-busting. Service worker checks for updates on every load. If new version: show "Доступна новая версия. [Обновить]" prompt. |
| H10 | DNS resolution fails | 🟢 | Rare but possible. Offline mode kicks in automatically. Show connectivity error. |

---

## I. TIMEZONE & TIMING

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| I1 | Server timezone ≠ user timezone | 🟡 | Store all timestamps as UTC (timestamptz in PostgreSQL). Convert to project timezone (settings.timezone, default "Asia/Almaty") for display. All Telegram messages show local time. |
| I2 | End-of-day prompt time set wrong | 🟢 | Default 16:30 Almaty time. Foreman can change in settings. Validate: must be between 12:00-23:00. |
| I3 | Cron job fires at wrong time | 🟡 | Vercel cron uses UTC. Convert project's EOD time to UTC for scheduling. Test thoroughly. Log every cron execution. |
| I4 | Vercel cron double-fires | 🟡 | Use idempotency key: check if today's EOD prompt already sent (daily_reports table or a flags table). If already sent: skip. |
| I5 | Task created at 23:59 — which day? | 🟢 | Task's due_date field determines the day, not created_at. If foreman creates at 23:59 with due_date = today: it's today. Default due_date = today (can be changed). |
| I6 | Worker confirms at 00:01 — previous day or current? | 🟢 | task_update.created_at records the exact moment. Task belongs to its due_date. Late confirmation is noted in report as "подтверждено с опозданием". |
| I7 | Site works weekends | ⚪ | No weekend logic. The system works every day. Foreman creates tasks only on working days. |
| I8 | Holiday handling | ⚪ | No holiday logic. Same as weekends. If no tasks created: nothing happens. |

---

## J. SECURITY

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| J1 | Invite code brute force | 🟡 | Codes are 12-char hex (encode(gen_random_bytes(6), 'hex')). That's 2^48 ≈ 281 trillion combinations. Rate-limit /start to 5 attempts per minute per chat_id. Practically unbreakable. |
| J2 | SQL injection via task title | 🔴 | Supabase client uses parameterized queries by default. NEVER use raw string interpolation in SQL. Always use .insert(), .update(), .eq() etc. |
| J3 | XSS via task content in dashboard | 🔴 | React JSX auto-escapes all variables. NEVER use dangerouslySetInnerHTML with user-generated content. Telegram bot API auto-escapes HTML. |
| J4 | Telegram bot token exposed | 🔴 | Store in environment variables only. Never commit to git. Vercel encrypts env vars. If leaked: revoke immediately via @BotFather, create new token. |
| J5 | Supabase keys exposed | 🔴 | Anon key (public) is safe for client-side — Row Level Security (RLS) protects data. Service role key must ONLY be in server-side env vars. Never expose in client code. |
| J6 | Unauthorized access to other projects | 🔴 | Implement Supabase RLS policies: users can only read/write data where project_id matches their own. Test RLS thoroughly. |
| J7 | Worker accesses foreman dashboard URL | 🟡 | Auth check on every page load. If user.role !== 'foreman' && user.role !== 'director': redirect to /unauthorized. Workers shouldn't even know the dashboard URL. |
| J8 | API routes accessed without auth | 🔴 | Every API route: extract and verify Supabase auth token from request headers. Return 401 if invalid. Telegram webhook: verify Telegram's secret token in headers. |
| J9 | Photo EXIF data leaks GPS | 🟢 | We WANT GPS for verification. But strip other EXIF (camera model, etc.) before storing. Use sharp library: sharp(buffer).rotate().withMetadata({exif: false}).toBuffer(). Re-add only GPS. |
| J10 | Rate limiting on API routes | 🟡 | Implement basic rate limiting: max 60 requests per minute per user for API routes. Use Vercel's edge middleware or a simple in-memory counter (resets on cold start, which is fine for MVP). |
| J11 | CORS misconfiguration | 🟡 | Next.js API routes: set Access-Control-Allow-Origin to your specific domain only (not *). For development: allow localhost. |

---

## K. DEVICE & BROWSER

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| K1 | Old Android (pre-Chrome 49, no MediaRecorder) | 🟡 | Feature detection on load. If no MediaRecorder: hide voice button, show manual-only mode. Display: "Обновите браузер для голосовых функций." |
| K2 | iOS Safari (limited PWA support) | 🟡 | PWA installs on iOS but has limitations: no push notifications, no background sync. Core functionality (dashboard, task creation) works fine. Voice recording works in Safari. Note: most construction workers in KZ use Android. |
| K3 | Very small screen (320px) | 🟢 | Use Tailwind responsive classes. Test at 320px minimum. Task cards: stack vertically, full width. Buttons: minimum 44px touch target. |
| K4 | Tablet / large screen | ⚪ | Responsive layout. Dashboard can use two-column layout on tablet. No special handling needed. |
| K5 | Low-memory phone | 🟢 | Minimize JS bundle (Next.js code-splitting handles this). Lazy-load analytics page. Don't load all tasks at once — paginate. |
| K6 | Phone storage full (can't save to IndexedDB) | 🟢 | Catch QuotaExceededError. Show: "Память телефона заполнена. Очистите место для офлайн-режима." App works in online-only mode as fallback. |
| K7 | Browser blocks cookies/localStorage | 🟢 | Supabase auth needs localStorage. If blocked: auth won't persist between sessions. Show: "Включите cookies в настройках браузера для входа." |
| K8 | PWA not updating to latest version | 🟢 | Service worker update on every navigation. "Skipwaiting" on new version detection. Show update prompt to user. |
| K9 | Multiple browser tabs open | 🟡 | Supabase realtime syncs across tabs. But auth state could conflict. Use BroadcastChannel API to sync auth across tabs. Or simply: detect multiple tabs and show "Приложение открыто в другой вкладке." |
| K10 | Dark mode vs light mode | ⚪ | Use Tailwind dark: classes from the start. Respect prefers-color-scheme. Construction workers on bright sites may prefer light mode. Default: light. |
| K11 | Screen reader / accessibility | 🟢 | Use semantic HTML (buttons, headings, labels). ARIA labels on icon buttons. Alt text on images. Not critical for MVP but good practice. |

---

## L. REAL-WORLD CONSTRUCTION SCENARIOS

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| L1 | Rain starts → outdoor tasks cancelled | 🟡 | Foreman uses "Отменить все задачи на сегодня" bulk action. Workers get: "⛔ Работы приостановлены. Ожидайте указаний." One tap, not 15 individual cancellations. |
| L2 | Equipment breakdown → multiple tasks blocked | 🟡 | Foreman marks equipment-dependent tasks as "problem". Workers notified. Foreman creates replacement tasks or waits. The system records the delay cause. |
| L3 | Subcontractor no-show | 🟢 | Their tasks stay unconfirmed. After reminder timeout: foreman sees they never confirmed. Foreman decides how to handle (call, replace, reschedule). |
| L4 | Inspector arrives → all work pauses | 🟢 | Foreman uses "Приостановить все" (pause all active tasks). Workers see: "⏸ Работы приостановлены. Ожидайте." When inspection done: "Возобновить" sends tasks back. |
| L5 | Power outage → phones die | 🟢 | All data persisted in Supabase. When phones charge: workers reconnect, receive queued messages. Data is never lost. |
| L6 | Safety incident → protocol takes over | 🟢 | Tasks become irrelevant during incident. Foreman pauses project. After resolution: system shows exactly what was in progress when incident occurred (useful for investigation). |
| L7 | Client changes scope mid-day | 🟡 | Foreman cancels affected tasks (bulk or individual). Creates new tasks via voice. Workers get cancellation + new assignments. Cancelled tasks documented in report. |
| L8 | Material delivery delayed | 🟢 | If tasks depend on materials: foreman marks as "blocked" with reason "ожидание материала". Workers notified. Time tracking records the delay. |
| L9 | Two foremen give conflicting tasks to same worker | 🟡 | Both tasks appear in worker's Telegram. Worker sees both and asks for clarification. Dashboard shows task creator, so foremen can coordinate. V2: add "conflict detection" alert. |
| L10 | Night shift / day shift same project | 🟡 | Each shift is treated as a new "day" in the system. Foreman creates tasks for their shift. EOD prompt timing configurable per-shift. Tasks carry over between shifts if needed. |
| L11 | Worker rotates between projects in a week | 🟢 | Worker can only be in one project at a time. When moved: foreman deactivates from old project, worker clicks new invite link. Old tasks archived. |
| L12 | Seasonal workers leave mid-project | 🟢 | Foreman deactivates. Incomplete tasks flagged for reassignment. Normal flow. |
| L13 | Site temporarily shut down (permits) | 🟢 | No tasks created = nothing happens. When site reopens: foreman creates tasks as normal. Historical data preserved. |
| L14 | Part of site restricted (safety zone) | ⚪ | Tasks in restricted area: foreman doesn't create them, or cancels existing ones. System doesn't know about physical zones (v2 possibility). |
| L15 | Foreman is sick / absent | 🟡 | Another foreman on the project (if multi-foreman) takes over. If sole foreman: director can view but not create tasks. System continues tracking worker activity on existing tasks. Workers can still complete and report. |
| L16 | Worker's phone stolen | 🟢 | Foreman deactivates worker. Thief can't access dashboard (needs auth). Telegram bot only shows that worker's tasks — no project-wide data. Worker gets new phone, new invite link, reconnects. |
| L17 | Foreman accidentally sends tasks to wrong project | 🟡 | Tasks go to workers in that project. Foreman realizes mistake, cancels tasks. Workers get cancellation. Prevention: project name shown prominently during task creation, with confirmation: "Отправить задачи в проект [Name]?" |
| L18 | Very large project (130+ workers like Павел's) | 🟡 | Telegram rate limiting: send 30 msg/sec max. 130 messages ≈ 5 seconds. Queue messages. Dashboard: paginate worker list. Filter by brigade. |
| L19 | Worker has no tasks today (idle) | ⚪ | Worker receives nothing from bot. Bot doesn't nag idle workers. If worker messages bot: "На сегодня задач нет. Обратитесь к прорабу." |
| L20 | Internet available only in прорабская (site office) | 🟡 | Foreman creates/sends tasks from office (has internet). Workers receive on phones (may have some signal). Workers walk to office area to sync if needed. System design tolerates delayed responses. |

---

## M. ERROR RECOVERY

| # | Edge Case | Severity | Mitigation |
|---|-----------|----------|------------|
| M1 | App crashes mid-task-creation | 🟢 | IndexedDB autosaves draft every 10 seconds. On reload: "У вас есть несохранённый черновик. Восстановить?" |
| M2 | Partial batch send (5 of 12 tasks sent, then error) | 🟡 | Track which tasks were sent (status='sent' in DB). On retry: only send unsent tasks. Dashboard shows partial send state. |
| M3 | Report generation fails | 🟢 | Try-catch around report generation. If fails: show error, allow retry. Foreman can still see all data in dashboard manually. |
| M4 | Auth token expires mid-session | 🟡 | Supabase auto-refreshes tokens. If refresh fails: redirect to login. Preserve current page URL, redirect back after re-auth. |
| M5 | Vercel deployment breaks production | 🔴 | Use Vercel's instant rollback. Preview deployments for testing before promoting to production. Environment: preview branch for testing, main for production. |
| M6 | Data accidentally deleted | 🔴 | Soft deletes only. Never hard-delete tasks, users, or projects. Add `deleted_at` timestamptz column. Filter out deleted records in all queries. Supabase has daily backups on Pro plan. |

---

## SUMMARY: Critical Items Checklist

Before launching to real users, verify ALL 🔴 items are handled:

- [ ] A10: Browser MediaRecorder detection + fallback
- [ ] A13: Voice recording saved to IndexedDB before upload
- [ ] B4: LLM invalid JSON handling + retry + manual fallback
- [ ] B13: Manual task creation works WITHOUT any API
- [ ] C16: Inline button idempotency (no double-processing)
- [ ] C26: Telegram webhook deduplication (update_id tracking)
- [ ] C9: Failed Telegram sends queued for retry
- [ ] D5: Task completion idempotency
- [ ] D13: Cross-project assignment validation
- [ ] D22: SQL injection / XSS prevention
- [ ] E1: Circular dependency detection
- [ ] E2: Self-dependency prevention
- [ ] E14: Dependency unlock is DB-first, Telegram-second
- [ ] F1: Prevent foreman self-deletion with active project
- [ ] G8: Supabase offline fallback
- [ ] G9: Cron job to keep Supabase alive (free tier pauses!)
- [ ] H1: Offline voice recording preservation
- [ ] J2-J3: SQL injection + XSS prevention
- [ ] J4-J5: Secrets in env vars only
- [ ] J6: Row Level Security on all tables
- [ ] J8: Auth on every API route
- [ ] M5: Deployment rollback plan
- [ ] M6: Soft deletes only, never hard delete
