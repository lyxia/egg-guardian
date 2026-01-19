import { createApiService } from './apiService';
import type ApiService from './apiService';

/**
 * 全局 ApiService 实例
 * 在 App 初始化时创建，供整个应用使用
 */
let apiServiceInstance: ApiService | null = null;

/**
 * 设置全局 ApiService 实例
 */
export function setApiService(instance: ApiService) {
  apiServiceInstance = instance;
}

/**
 * 获取全局 ApiService 实例
 */
export function getApiService(): ApiService {
  if (!apiServiceInstance) {
    throw new Error('ApiService not initialized. Call setApiService first.');
  }
  return apiServiceInstance;
}

/**
 * 检查 ApiService 是否已初始化
 */
export function isApiServiceInitialized(): boolean {
  return apiServiceInstance !== null;
}
