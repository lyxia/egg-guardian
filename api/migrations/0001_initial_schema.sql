-- 用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  weekly_base_salary INTEGER NOT NULL DEFAULT 4000,
  last_salary_date TEXT,
  is_muted INTEGER NOT NULL DEFAULT 0,
  parent_password_hash TEXT,
  is_parent_password_set INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK(stars IN (1,2,3)),
  days TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_sort ON tasks(user_id, sort_order);

-- 每日日志表
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  base_salary INTEGER NOT NULL,
  total_stars INTEGER NOT NULL,
  star_value INTEGER NOT NULL,
  deduction INTEGER NOT NULL,
  actual_amount INTEGER NOT NULL,
  net_income INTEGER NOT NULL,
  tasks_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_user ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON daily_logs(user_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_user_date_unique ON daily_logs(user_id, date);
