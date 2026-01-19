// Cloudflare Workers 环境类型
export interface Env {
  DB: D1Database;
  SSO_URL: string;
  ALLOWED_ORIGIN: string;
  CALLBACK_URL: string;
  JWT_SECRET: string;
}

// SSO 验证响应
export interface SSOVerifyResponse {
  valid: boolean;
  user?: {
    email: string;
    username: string;
  };
}

// 用户资料
export interface UserProfile {
  user_id: string;
  balance: number;
  weekly_base_salary: number;
  last_salary_date: string | null;
  is_muted: number;
  parent_password_hash: string | null;
  is_parent_password_set: number;
  created_at: number;
  updated_at: number;
}

// 任务
export interface Task {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  stars: number;
  days: string; // JSON 数组字符串
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// 日志
export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  base_salary: number;
  total_stars: number;
  star_value: number;
  deduction: number;
  actual_amount: number;
  net_income: number;
  tasks_status: string; // JSON 数组字符串
  created_at: number;
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}
