export interface GuardianConfig {
  weekly_base_salary: number;
  last_salary_date: string; // ISO Date string YYYY-MM-DD
}

export interface UserProfile {
  user_id: string;
  balance: number;
  guardian_config: GuardianConfig;
  isMuted?: boolean; // 静音设置，来自 eggfocus
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface Task {
  id: string;
  title: string;
  icon: string; // Emoji or icon name
  stars: 1 | 2 | 3;
  days: DayOfWeek[];
}

export interface TaskStatus {
  task_id: string;
  completed: boolean;
  deduction: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  base_salary: number;
  tasks_status: TaskStatus[];
  net_income: number; // 保留向后兼容，等于 actual_amount
  total_stars: number;
  star_value: number;
  deduction: number; // 扣除金额
  actual_amount: number; // 实际领取金额 = base_salary - deduction
}

export interface AppState {
  user: UserProfile;
  tasks: Task[];
  logs: DailyLog[];
}

// eggfocus 数据格式
export interface CoinRecord {
  id: string;
  type: 'income' | 'expense';
  status: 'pending' | 'confirmed';
  amount: number;
  createdAt: number;
  detail: {
    taskName: string;
    startTime: number;
    endTime: number;
    focusDuration: number;
    baseCoins: number;
    bonusCoins: number;
  };
  confirmedAt?: number;
}

export interface EggfocusUserData {
  state: {
    coins: number;
    isMuted: boolean;
  };
  version: number;
}

export interface EggfocusParentAuth {
  state: {
    passwordHash: string;
    isPasswordSet: boolean;
  };
  version: number;
}

export interface EggfocusCoinRecords {
  state: {
    records: CoinRecord[];
  };
  version: number;
}