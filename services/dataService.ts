import { AppState, DailyLog, Task, UserProfile, TaskStatus } from '../types';
import { INITIAL_USER, INITIAL_TASKS, STORAGE_KEY, DAILY_SALARY_TARGET } from '../constants';
import { loadSyncedState, syncData } from './dataAdapter';
import { getApiService, isApiServiceInitialized } from './apiServiceInstance';

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
 * 验证密码（从云端验证）
 */
export const verifyPassword = async (password: string): Promise<boolean> => {
  if (!isApiServiceInitialized()) {
    console.error('API 服务未初始化，无法验证密码');
    return false;
  }

  try {
    const apiService = getApiService();
    const hash = simpleHash(password);
    const isValid = await apiService.verifyParentPassword(hash);
    return isValid;
  } catch (error) {
    console.error('验证密码失败:', error);
    return false;
  }
};

/**
 * 设置密码（保存到云端）
 */
export const setPassword = async (password: string): Promise<void> => {
  if (!isApiServiceInitialized()) {
    throw new Error('API 服务未初始化，无法设置密码');
  }

  const hash = simpleHash(password);
  
  try {
    const apiService = getApiService();
    await apiService.updateParentPassword(hash);
    console.log('家长密码已保存到云端');
  } catch (error) {
    console.error('保存家长密码到云端失败:', error);
    throw error;
  }
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