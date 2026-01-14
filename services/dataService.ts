import { AppState, DailyLog, Task, UserProfile, TaskStatus, EggfocusParentAuth } from '../types';
import { INITIAL_USER, INITIAL_TASKS, STORAGE_KEY, DAILY_SALARY_TARGET } from '../constants';
import { loadSyncedState, syncData, loadEggfocusParentAuth, saveEggfocusParentAuth } from './dataAdapter';

export { DAILY_SALARY_TARGET };

export const loadState = (): AppState => {
  // 使用数据适配器加载同步的数据
  return loadSyncedState();
};

export const saveState = (state: AppState) => {
  // 使用数据适配器同步保存两种格式
  syncData(state);
};

/**
 * 加载家长认证数据
 */
export const loadParentAuth = (): EggfocusParentAuth | null => {
  return loadEggfocusParentAuth();
};

/**
 * 保存家长认证数据
 */
export const saveParentAuth = (auth: EggfocusParentAuth) => {
  saveEggfocusParentAuth(auth);
};

/**
 * 验证密码
 */
export const verifyPassword = (password: string): boolean => {
  const auth = loadParentAuth();
  if (!auth || !auth.state.isPasswordSet) {
    return false;
  }
  // 简单的哈希比较（实际应用中应使用更安全的哈希算法）
  // 这里假设密码哈希是简单的字符串转换
  const inputHash = simpleHash(password);
  return inputHash === auth.state.passwordHash;
};

/**
 * 设置密码
 */
export const setPassword = (password: string): void => {
  const hash = simpleHash(password);
  saveParentAuth({
    state: {
      passwordHash: hash,
      isPasswordSet: true,
    },
    version: 0,
  });
};

/**
 * 简单的密码哈希函数（仅用于演示，生产环境应使用更安全的方法）
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const getTodayDateString = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDayOfWeek = (): number => {
  return new Date().getDay();
};

export const calculateStarValue = (tasks: Task[], dateStr: string = getTodayDateString()): { totalStars: number, valuePerStar: number, todaysTasks: Task[] } => {
  const dayIndex = new Date(dateStr).getDay();
  
  // Filter tasks active for today (or the given date's weekday)
  const todaysTasks = tasks.filter(t => t.days.includes(dayIndex as any));
  
  const totalStars = todaysTasks.reduce((sum, t) => sum + t.stars, 0);
  
  // Avoid division by zero
  const valuePerStar = totalStars > 0 ? Math.floor(DAILY_SALARY_TARGET / totalStars) : 0;

  return { totalStars, valuePerStar, todaysTasks };
};

export const checkWeeklySalaryReset = (user: UserProfile): { updatedUser: UserProfile, salaryAdded: boolean } => {
  const today = new Date();
  const todayStr = getTodayDateString();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday

  // Basic logic: If it's Monday, and we haven't updated since LAST Monday, add salary.
  // For simplicity in this demo: If today is Monday AND last_salary_date is not today.
  
  if (dayOfWeek === 1 && user.guardian_config.last_salary_date !== todayStr) {
    return {
      updatedUser: {
        ...user,
        balance: user.balance + user.guardian_config.weekly_base_salary,
        guardian_config: {
          ...user.guardian_config,
          last_salary_date: todayStr
        }
      },
      salaryAdded: true
    };
  }
  return { updatedUser: user, salaryAdded: false };
};

export const processSettlement = (
  user: UserProfile,
  tasks: Task[],
  completionMap: Record<string, boolean>
): { log: DailyLog, newUserBalance: number } => {
  const { totalStars, valuePerStar, todaysTasks } = calculateStarValue(tasks);
  
  const tasks_status: TaskStatus[] = [];
  let totalDeduction = 0; // 扣除制：计算未完成任务的扣除

  todaysTasks.forEach(task => {
    const isCompleted = completionMap[task.id] === true; // 只有明确为 true 才算完成
    // 未完成任务计算扣除金额
    const taskDeduction = isCompleted ? 0 : Math.floor(valuePerStar * task.stars);
    
    tasks_status.push({
      task_id: task.id,
      completed: isCompleted,
      deduction: taskDeduction // 记录实际扣除值
    });

    totalDeduction += taskDeduction;
  });

  // 扣除制计算：实际领取金额 = 基础工资 - 扣除金额
  const actualAmount = DAILY_SALARY_TARGET - totalDeduction;
  
  return {
    log: {
      date: getTodayDateString(),
      base_salary: DAILY_SALARY_TARGET,
      tasks_status,
      net_income: actualAmount, // 向后兼容，等于 actual_amount
      total_stars: totalStars,
      star_value: valuePerStar,
      deduction: totalDeduction, // 新增：扣除金额
      actual_amount: actualAmount // 新增：实际领取金额
    },
    newUserBalance: user.balance + actualAmount // 余额增加实际领取金额
  };
};