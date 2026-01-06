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
  let totalReward = 0; // 奖励制：计算获得的奖励

  todaysTasks.forEach(task => {
    const isCompleted = !!completionMap[task.id];
    // 完成任务获得奖励，未完成不获得奖励（不扣除）
    const reward = isCompleted ? (valuePerStar * task.stars) : 0;
    
    tasks_status.push({
      task_id: task.id,
      completed: isCompleted,
      deduction: 0 // deduction 字段保留为0，因为不再扣除
    });

    totalReward += reward;
  });

  // Calculate Net Income: 572 (Theoretical) - Deductions
  // However, the prompt says: "If all done -> 572 added". 
  // "If not done -> deduct from balance".
  // Actually the prompt says: "Daily Check: Daily salary ~572. If all done -> 572 pocketed. If not -> deduct from balance based on stars."
  // Wait, does "pocketed" mean added to balance? 
  // "周薪制: System sends 4000 on Monday... daily check decides if they KEEP it."
  // So the 4000 is ALREADY in the balance on Monday.
  // The daily check is purely about DEDUCTING what you didn't earn.
  // If I finish everything, I deduct 0. My balance stays high.
  // If I fail a task, I deduct X. My balance drops.
  // 
  // Let's re-read carefully: "If all done -> 572 all in pocket (balance unchanged)." 
  // YES. The money was front-loaded.
  // "If not done -> deduct corresponding amount from balance."
  
  // So Net Income for the log is actually negative or zero relative to the user's current balance state?
  // Or should we log the "Virtual Income"? 
  // The prompt says "Income Animation: +287". 
  // This contradicts the "Front-loaded" theory slightly OR it means we are showing "You kept +287".
  // Let's stick to the Prompt 4.2: "Input animation: +287... Gold coins fly into total balance."
  // AND Prompt 2.2: "Monday auto distribute 4000".
  // Combining these:
  // Monday: +4000.
  // Tuesday Daily Check: "You kept 572". 
  // If I fail tasks worth 285. I kept 287.
  // If the logic is "Balance Unchanged" when full, it means the 4000 is already there.
  // If I fail, I lose money.
  // 
  // VISUAL TRICK: 
  // The User perceives "Earning". 
  // But mathematically: Balance = Balance - Deduction.
  // Wait, if I click "Claim", and it shows "+287", it implies Balance increases.
  // IF Balance increases daily, then the 4000 shouldn't be given on Monday?
  // Prompt 2.2 says: "System distributes 4000 on Monday".
  // Prompt 2.2 says: "If tasks incomplete -> deduct from balance".
  // This implies the 4000 IS in the balance.
  // So "Earning +287" is a "Psychological" earning (You saved this amount!).
  // BUT Prompt 4.2 says "Gold coins fly into total balance". This usually implies addition.
  // 
  // Interpretation A (Front-loaded): Balance starts high. Bad behavior reduces it. "Claiming" is just "Confirming no deduction".
  // Interpretation B (Accrual): "This is the budget". You unlock it daily.
  // 
  // Let's look at Prompt 2.1: "Unified currency... Single Pool".
  // Prompt 2.2 "Week Salary... System auto distributes 4000 to account".
  // "Daily Check... If all done -> 572 pocketed (balance unchanged)".
  // THIS CONFIRMS FRONT-LOADED.
  // "If not done -> deduct...".
  // 
  // So the "Settlement" visual of "+287" might be confusing if we add it. 
  // Actually, if "Balance Unchanged" means "No Deduction", then the visual should probably be "You kept 287!".
  // Or maybe the prompt implies: We SHOW +287 as "This is what you secured today", but we only subtract the difference?
  // 
  // Let's implement EXACTLY:
  // 1. Monday: Balance += 4000.
  // 2. Daily Settlement: 
  //    Calculate Deductions. 
  //    NewBalance = OldBalance - Deductions.
  //    Visual: "You guarded 287!" (if 285 was lost). 
  //    The prompt 4.2 says: "Show actual income amount (e.g., +287)... Coins fly into balance."
  //    This is contradictory if balance decreases.
  //    
  //    *Hypothesis*: The user wants the KID to feel like they are earning. 
  //    Maybe the "4000" is a "Pending Budget" visualization, not immediately in `user.balance`?
  //    "System distributes 4000 to account" sounds immediate.
  //    
  //    Let's go with the most robust interpretation for a "Guardian" app (Risk/Loss aversion):
  //    The money is in the account.
  //    We highlight LOSS.
  //    If there is a deduction, we show "-285" (Red).
  //    If we kept money, we show "Guarded +287" (Yellow/Green) but mathematically we just DON'T subtract it.
  //    
  //    However, to satisfy "Coins fly into balance":
  //    Maybe the "Available Balance" is what they can spend.
  //    Let's stick to the math: Balance = Balance - Deduction.
  //    The "Net Income" in the log will be (572 - Deduction).
  
  // 奖励制：余额只增加不减少
  // 全部完成 = +572，部分完成 = +部分金额，未完成 = +0
  const netIncome = totalReward;
  
  return {
    log: {
      date: getTodayDateString(),
      base_salary: DAILY_SALARY_TARGET,
      tasks_status,
      net_income: netIncome,
      total_stars: totalStars,
      star_value: valuePerStar
    },
    newUserBalance: user.balance + totalReward // 余额增加，不减少
  };
};