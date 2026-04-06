# AI Bek — Advanced Task Manager for Construction

## What's in this package

| File | What it is | What to do with it |
|------|-----------|-------------------|
| `SPEC.md` | Complete MVP specification | Your bible. Read it. Follow the build order exactly. |
| `database.sql` | PostgreSQL schema with triggers | Paste into Supabase SQL Editor → Run |
| `edge_cases.md` | 130 edge cases with mitigations | Reference when building each feature |
| `.env.local.example` | Environment variables template | Copy to `.env.local`, fill in your keys |

## Exactly what to do right now

### Step 1 (5 minutes)
- [ ] Create Telegram bot: message @BotFather → /newbot → save token
- [ ] Create Supabase project: supabase.com → New Project → save URL + keys
- [ ] Create Groq account: console.groq.com → create API key

### Step 2 (10 minutes)  
- [ ] Paste `database.sql` into Supabase SQL Editor → click Run
- [ ] Create storage bucket "photos" in Supabase Dashboard → Storage

### Step 3 (start building)
- [ ] Open Claude / Cursor
- [ ] Follow the build order in `SPEC.md` → "Build order (exact steps)"
- [ ] Build Step 1 (init project), then Step 3 (manual task creation) FIRST
- [ ] Voice comes later. Get the basic loop working first.

## The rule
If manual task creation → Telegram delivery → worker confirm → complete with photo → dashboard update works flawlessly, you have an MVP. Everything else builds on top.
