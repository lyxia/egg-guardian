import { AppState, UserProfile, DailyLog, CoinRecord, EggfocusUserData, EggfocusParentAuth, EggfocusCoinRecords } from '../types';
import { INITIAL_USER, INITIAL_TASKS } from '../constants';
import { getTodayDateString } from './dataService';

const EGGFOCUS_USERDATA_KEY = 'eggfocus-userdata';
const EGGFOCUS_PARENT_AUTH_KEY = 'eggfocus-parent-auth';
const EGGFOCUS_COIN_RECORDS_KEY = 'eggfocus-coin-records';
const EGG_GUARDIAN_KEY = 'egg_guardian_data_v1';

/**
 * 从 localStorage 读取 eggfocus 用户数据
 */
export const loadEggfocusUserData = (): EggfocusUserData | null => {
  try {
    const stored = localStorage.getItem(EGGFOCUS_USERDATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load eggfocus user data', e);
  }
  return null;
};

/**
 * 保存 eggfocus 用户数据到 localStorage
 */
export const saveEggfocusUserData = (data: EggfocusUserData) => {
  try {
    localStorage.setItem(EGGFOCUS_USERDATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save eggfocus user data', e);
  }
};

/**
 * 从 localStorage 读取 eggfocus 家长认证数据
 */
export const loadEggfocusParentAuth = (): EggfocusParentAuth | null => {
  try {
    const stored = localStorage.getItem(EGGFOCUS_PARENT_AUTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load eggfocus parent auth', e);
  }
  return null;
};

/**
 * 保存 eggfocus 家长认证数据到 localStorage
 */
export const saveEggfocusParentAuth = (data: EggfocusParentAuth) => {
  try {
    localStorage.setItem(EGGFOCUS_PARENT_AUTH_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save eggfocus parent auth', e);
  }
};

/**
 * 从 localStorage 读取 eggfocus 硬币记录
 */
export const loadEggfocusCoinRecords = (): EggfocusCoinRecords | null => {
  try {
    const stored = localStorage.getItem(EGGFOCUS_COIN_RECORDS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load eggfocus coin records', e);
  }
  return null;
};

/**
 * 保存 eggfocus 硬币记录到 localStorage
 */
export const saveEggfocusCoinRecords = (data: EggfocusCoinRecords) => {
  try {
    localStorage.setItem(EGGFOCUS_COIN_RECORDS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save eggfocus coin records', e);
  }
};

/**
 * 将 eggfocus 数据转换为 egg-guardian 格式
 */
export const convertToEggGuardian = (
  userData: EggfocusUserData | null,
  coinRecords: EggfocusCoinRecords | null,
  existingState?: AppState
): Partial<AppState> => {
  const result: Partial<AppState> = {};

  // 转换用户数据
  if (userData) {
    const existingUser = existingState?.user || INITIAL_USER;
    result.user = {
      ...existingUser,
      balance: userData.state.coins,
      isMuted: userData.state.isMuted,
    };
  }

  // 转换硬币记录为日志（聚合同一天的记录）
  if (coinRecords && coinRecords.state.records.length > 0) {
    const logsMap = new Map<string, DailyLog>();
    
    // 先保留现有的日志
    if (existingState?.logs) {
      existingState.logs.forEach(log => {
        logsMap.set(log.date, log);
      });
    }

    // 处理已确认的记录，按日期聚合
    coinRecords.state.records
      .filter(record => record.status === 'confirmed' && record.type === 'income')
      .forEach(record => {
        const date = new Date(record.confirmedAt || record.createdAt);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        const existingLog = logsMap.get(dateStr);
        if (existingLog) {
          // 如果当天已有日志，更新净收入
          existingLog.net_income += record.amount;
        } else {
          // 创建新日志（简化版本，因为 eggfocus 记录不包含任务状态）
          logsMap.set(dateStr, {
            date: dateStr,
            base_salary: record.amount,
            tasks_status: [],
            net_income: record.amount,
            total_stars: 0,
            star_value: 0,
          });
        }
      });

    result.logs = Array.from(logsMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  return result;
};

/**
 * 将 egg-guardian 数据转换为 eggfocus 格式
 */
export const convertToEggfocus = (state: AppState): {
  userData: EggfocusUserData;
  coinRecords: EggfocusCoinRecords;
} => {
  // 转换用户数据
  const userData: EggfocusUserData = {
    state: {
      coins: state.user.balance,
      isMuted: state.user.isMuted || false,
    },
    version: 0,
  };

  // 转换日志为硬币记录（只转换最近的记录，避免数据过多）
  const records: CoinRecord[] = [];
  
  // 保留现有的 eggfocus 记录
  const existingRecords = loadEggfocusCoinRecords();
  const existingRecordIds = new Set<string>();
  if (existingRecords) {
    // 保留 pending 状态的记录
    const pendingRecords = existingRecords.state.records.filter(r => r.status === 'pending');
    records.push(...pendingRecords);
    // 记录所有现有记录的 ID，避免重复
    existingRecords.state.records.forEach(r => existingRecordIds.add(r.id));
  }
  
  // 从日志创建记录（只创建新的，避免重复）
  state.logs.forEach(log => {
    if (log.net_income > 0) {
      const date = new Date(log.date);
      const recordId = `guardian-${log.date}`;
      // 只有当记录不存在时才添加
      if (!existingRecordIds.has(recordId)) {
        records.push({
          id: recordId,
          type: 'income',
          status: 'confirmed',
          amount: log.net_income,
          createdAt: date.getTime(),
          confirmedAt: date.getTime(),
          detail: {
            taskName: '每日任务完成',
            startTime: date.getTime(),
            endTime: date.getTime(),
            focusDuration: 0,
            baseCoins: log.net_income,
            bonusCoins: 0,
          },
        });
      }
    }
  });

  const coinRecords: EggfocusCoinRecords = {
    state: {
      records: records.sort((a, b) => b.createdAt - a.createdAt),
    },
    version: 0,
  };

  return { userData, coinRecords };
};

/**
 * 同步数据：同时保存两种格式
 */
export const syncData = (state: AppState) => {
  // 转换为 eggfocus 格式并保存
  const { userData, coinRecords } = convertToEggfocus(state);
  saveEggfocusUserData(userData);
  saveEggfocusCoinRecords(coinRecords);

  // 保存 egg-guardian 格式
  try {
    localStorage.setItem(EGG_GUARDIAN_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save egg-guardian data', e);
  }
};

/**
 * 加载数据：优先读取 eggfocus 数据，如果不存在则使用 egg-guardian 数据
 */
export const loadSyncedState = (): AppState => {
  // 尝试读取 egg-guardian 数据
  let existingState: AppState | null = null;
  try {
    const stored = localStorage.getItem(EGG_GUARDIAN_KEY);
    if (stored) {
      existingState = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load egg-guardian data', e);
  }

  // 读取 eggfocus 数据
  const eggfocusUserData = loadEggfocusUserData();
  const eggfocusCoinRecords = loadEggfocusCoinRecords();

  // 如果存在 eggfocus 数据，优先使用
  if (eggfocusUserData || eggfocusCoinRecords) {
    const converted = convertToEggGuardian(eggfocusUserData, eggfocusCoinRecords, existingState || undefined);
    
    return {
      user: converted.user || existingState?.user || INITIAL_USER,
      tasks: existingState?.tasks || INITIAL_TASKS,
      logs: converted.logs || existingState?.logs || [],
    };
  }

  // 如果没有 eggfocus 数据，使用现有的 egg-guardian 数据或默认值
  return existingState || {
    user: INITIAL_USER,
    tasks: INITIAL_TASKS,
    logs: [],
  };
};

