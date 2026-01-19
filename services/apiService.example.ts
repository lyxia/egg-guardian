/**
 * ApiService 使用示例
 * 
 * 这个文件展示了如何创建和使用 ApiService 实例
 */

import { createApiService } from './apiService';

// 示例：创建 ApiService 实例
const apiService = createApiService(
  // API 基础 URL（从环境变量获取）
  (import.meta as any).env?.VITE_API_URL || 'https://api.activing.fun',
  
  // 获取 Token 的函数
  () => {
    return localStorage.getItem('sso_token');
  },
  
  // 401 未授权时的回调函数
  () => {
    // 清除本地 Token
    localStorage.removeItem('sso_token');
    localStorage.removeItem('user_id');
    
    // 跳转到登录页
    window.location.href = '/login';
  }
);

// 使用示例：

// 1. 获取用户资料
async function loadUserProfile() {
  try {
    const profile = await apiService.getProfile();
    console.log('用户资料:', profile);
    return profile;
  } catch (error) {
    console.error('加载用户资料失败:', error);
    // ApiService 已经处理了错误，这里可以显示用户友好的提示
  }
}

// 2. 更新用户资料
async function updateUserBalance(newBalance: number) {
  try {
    await apiService.updateProfile({ balance: newBalance });
    console.log('余额更新成功');
  } catch (error) {
    console.error('更新余额失败:', error);
  }
}

// 3. 获取任务列表
async function loadTasks() {
  try {
    const tasks = await apiService.getTasks();
    console.log('任务列表:', tasks);
    return tasks;
  } catch (error) {
    console.error('加载任务失败:', error);
  }
}

// 4. 创建新任务
async function addNewTask() {
  try {
    const newTask = await apiService.createTask({
      title: '洗碗',
      icon: '🍽️',
      stars: 2,
      days: [1, 2, 3, 4, 5],
    });
    console.log('任务创建成功:', newTask);
    return newTask;
  } catch (error) {
    console.error('创建任务失败:', error);
  }
}

// 5. 获取日志（带分页）
async function loadLogs() {
  try {
    const result = await apiService.getLogs({
      page: 1,
      limit: 30,
      startDate: '2025-01-01',
    });
    console.log('日志列表:', result.logs);
    console.log('分页信息:', result.pagination);
    return result;
  } catch (error) {
    console.error('加载日志失败:', error);
  }
}

// 6. 创建日志记录
async function saveSettlement() {
  try {
    await apiService.createLog({
      date: '2025-01-15',
      base_salary: 572,
      total_stars: 10,
      star_value: 57,
      deduction: 114,
      actual_amount: 458,
      net_income: 458,
      tasks_status: [
        { task_id: 'task_1', completed: true, deduction: 0 },
        { task_id: 'task_2', completed: false, deduction: 114 },
      ],
    });
    console.log('日志保存成功');
  } catch (error) {
    console.error('保存日志失败:', error);
  }
}

export {
  apiService,
  loadUserProfile,
  updateUserBalance,
  loadTasks,
  addNewTask,
  loadLogs,
  saveSettlement,
};
