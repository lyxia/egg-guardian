import { Task, UserProfile } from './types';

export const WEEKLY_SALARY = 4000;
export const DAILY_SALARY_TARGET = 572; // 4000 / 7 rounded

export const INITIAL_USER: UserProfile = {
  user_id: "kid_001",
  balance: 0,
  guardian_config: {
    weekly_base_salary: WEEKLY_SALARY,
    last_salary_date: "2025-12-29" // Set to a past date to trigger logic check
  }
};

export const INITIAL_TASKS: Task[] = [
  {
    id: "task_homework",
    title: "认真写完作业",
    icon: "📝",
    stars: 3,
    days: [1, 2, 3, 4, 5]
  },
  {
    id: "task_piano",
    title: "练琴20分钟",
    icon: "🎹",
    stars: 2,
    days: [0, 1, 2, 3, 4, 5, 6]
  },
  {
    id: "task_bag",
    title: "整理书包",
    icon: "🎒",
    stars: 1,
    days: [0, 1, 2, 3, 4, 5]
  },
  {
    id: "task_teeth",
    title: "早晚刷牙",
    icon: "🦷",
    stars: 1,
    days: [0, 1, 2, 3, 4, 5, 6]
  }
];

export const STORAGE_KEY = "egg_guardian_data_v1";
