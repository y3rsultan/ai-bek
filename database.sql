-- AI Bek — Database Schema
-- Paste this entire file into Supabase SQL Editor and run it.
-- This creates all tables, indexes, and RLS policies for the MVP.

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  settings jsonb DEFAULT '{
    "reminder_frequency_min": 120,
    "eod_prompt_time": "16:30",
    "default_photo_required": true,
    "timezone": "Asia/Almaty"
  }',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE brigades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,  -- links to Supabase Auth user
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('foreman','director','brigadier','worker')),
  telegram_chat_id bigint UNIQUE,
  telegram_username text,
  telegram_blocked boolean DEFAULT false,
  language text DEFAULT 'ru' CHECK (language IN ('ru','kk','en')),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  brigade_id uuid REFERENCES brigades(id) ON DELETE SET NULL,
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add foreign keys that reference users
ALTER TABLE projects ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE brigades ADD COLUMN brigadier_id uuid REFERENCES users(id);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Task content
  title text NOT NULL,
  description text,
  location text,
  materials text,
  safety_notes text,
  category text,
  priority text DEFAULT 'normal' CHECK (priority IN ('high','normal','low')),
  photo_required boolean DEFAULT true,
  
  -- Assignment
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  
  -- Dependency (simple: one predecessor)
  depends_on uuid REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN (
    'draft',       -- created, not sent
    'pending',     -- ready to send (or dependency resolved)
    'sent',        -- sent to worker via Telegram
    'confirmed',   -- worker tapped "Принял"
    'completed',   -- worker marked done + photo if required
    'incomplete',  -- end of day, not done
    'blocked',     -- waiting for dependency
    'cancelled'    -- soft-cancelled by foreman
  )),
  
  -- Time
  due_date date DEFAULT CURRENT_DATE,
  time_estimate_hours numeric,
  
  -- Completion data
  completed_at timestamptz,
  completion_photo_url text,
  completion_note text,
  
  -- Carry-over tracking
  carried_from uuid REFERENCES tasks(id),
  
  -- Telegram message tracking (for button callbacks)
  telegram_message_id bigint,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  update_type text NOT NULL CHECK (update_type IN (
    'created','sent','confirmed','completed',
    'blocked','unblocked','problem','reminder',
    'escalation','reassigned','cancelled','note'
  )),
  content text,
  photo_url text,
  voice_url text,
  metadata jsonb DEFAULT '{}',  -- GPS coords, timestamps, etc.
  created_at timestamptz DEFAULT now()
);

CREATE TABLE problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES users(id),
  task_id uuid REFERENCES tasks(id),
  description text,
  category text CHECK (category IN (
    'defect','material','safety','equipment','access','weather','other'
  )),
  severity text DEFAULT 'normal' CHECK (severity IN ('urgent','normal')),
  photo_url text,
  voice_url text,
  status text DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  content jsonb NOT NULL,
  sent_to_telegram boolean DEFAULT false,
  generated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, report_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tasks_project_date ON tasks(project_id, due_date);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_depends ON tasks(depends_on) WHERE depends_on IS NOT NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_task_updates_task ON task_updates(task_id, created_at);
CREATE INDEX idx_problems_project_status ON problems(project_id, status);
CREATE INDEX idx_users_telegram ON users(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX idx_users_invite ON users(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_users_project ON users(project_id, is_active);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DEPENDENCY CYCLE DETECTION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id uuid;
  visited uuid[];
BEGIN
  IF NEW.depends_on IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Self-dependency check
  IF NEW.depends_on = NEW.id THEN
    RAISE EXCEPTION 'Task cannot depend on itself';
  END IF;
  
  -- Walk the chain to detect cycles
  current_id := NEW.depends_on;
  visited := ARRAY[NEW.id];
  
  WHILE current_id IS NOT NULL LOOP
    IF current_id = ANY(visited) THEN
      RAISE EXCEPTION 'Circular dependency detected';
    END IF;
    visited := visited || current_id;
    SELECT depends_on INTO current_id FROM tasks WHERE id = current_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_task_dependency_cycle
  BEFORE INSERT OR UPDATE OF depends_on ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_dependency_cycle();

-- ============================================
-- AUTO-UNLOCK FUNCTION (when predecessor completes)
-- ============================================

CREATE OR REPLACE FUNCTION unlock_dependent_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE tasks 
    SET status = 'pending', updated_at = now()
    WHERE depends_on = NEW.id 
      AND status = 'blocked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completion_unlock
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION unlock_dependent_tasks();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brigades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- For MVP testing: allow authenticated users full access
-- Tighten these policies before real pilot
CREATE POLICY "Authenticated users can do everything" ON projects
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON users
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON brigades
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON tasks
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON task_updates
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON problems
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do everything" ON daily_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Grant access to service role (for Telegram webhook / server-side)
-- Service role bypasses RLS automatically in Supabase

-- ============================================
-- STORAGE BUCKET FOR PHOTOS
-- ============================================
-- Run this in Supabase Dashboard > Storage > Create Bucket:
-- Name: photos
-- Public: false
-- File size limit: 5MB
-- Allowed types: image/jpeg, image/png, image/webp
