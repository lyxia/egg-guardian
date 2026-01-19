import { UserProfile, Task, DailyLog } from '../types';

/**
 * API 响应格式
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * 日志查询参数
 */
export interface LogQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * ApiService 类
 * 提供统一的 API 调用封装，使用 Cookie 认证
 */
class ApiService {
  private baseUrl: string;
  private onUnauthorized: () => void;

  constructor(
    baseUrl: string,
    onUnauthorized: () => void
  ) {
    this.baseUrl = baseUrl;
    this.onUnauthorized = onUnauthorized;
  }

  /**
   * 统一的 fetch 封装方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 合并用户提供的 headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // 自动携带 Cookie
      });

      // 处理 401 错误 - 未授权或 Cookie 过期
      if (response.status === 401) {
        console.error('API Error: Unauthorized - Cookie invalid or expired');
        this.onUnauthorized();
        throw new ApiError('未授权，请重新登录', 401, 'UNAUTHORIZED');
      }

      // 解析响应
      const data: ApiResponse<T> = await response.json();

      // 处理业务错误
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || '请求失败';
        const errorCode = data.code || `HTTP_${response.status}`;
        
        console.error(`API Error [${errorCode}]:`, errorMessage);
        throw new ApiError(errorMessage, response.status, errorCode);
      }

      return data.data as T;
    } catch (error) {
      // 网络错误或其他异常
      if (error instanceof ApiError) {
        throw error;
      }

      console.error('Network Error:', error);
      throw new ApiError(
        '网络请求失败，请检查网络连接',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * GET 请求
   */
  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST 请求
   */
  private async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  private async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  private async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==================== 用户资料 API ====================

  /**
   * 获取用户资料
   */
  async getProfile(): Promise<UserProfile> {
    return this.get<UserProfile>('/api/profile');
  }

  /**
   * 更新用户资料
   */
  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    await this.put<void>('/api/profile', profile);
  }

  /**
   * 更新家长密码
   */
  async updateParentPassword(passwordHash: string): Promise<void> {
    await this.post<void>('/api/profile/parent-password', { passwordHash });
  }

  /**
   * 验证家长密码
   */
  async verifyParentPassword(passwordHash: string): Promise<boolean> {
    const result = await this.post<{ isValid: boolean; isPasswordSet: boolean }>(
      '/api/profile/verify-parent-password',
      { passwordHash }
    );
    return result.isValid;
  }

  // ==================== 任务 API ====================

  /**
   * 获取所有任务
   */
  async getTasks(): Promise<Task[]> {
    return this.get<Task[]>('/api/tasks');
  }

  /**
   * 创建新任务
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    return this.post<Task>('/api/tasks', task);
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, task: Partial<Task>): Promise<void> {
    await this.put<void>(`/api/tasks/${taskId}`, task);
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.delete<void>(`/api/tasks/${taskId}`);
  }

  // ==================== 日志 API ====================

  /**
   * 获取日志列表
   */
  async getLogs(params?: LogQueryParams): Promise<{
    logs: DailyLog[];
    pagination: Pagination;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/logs?${queryString}` : '/api/logs';

    return this.get<{ logs: DailyLog[]; pagination: Pagination }>(endpoint);
  }

  /**
   * 创建日志记录
   */
  async createLog(log: DailyLog): Promise<void> {
    await this.post<void>('/api/logs', log);
  }
}

/**
 * 创建 ApiService 实例的工厂函数
 */
export function createApiService(
  baseUrl: string,
  onUnauthorized: () => void
): ApiService {
  return new ApiService(baseUrl, onUnauthorized);
}

export default ApiService;
