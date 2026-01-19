/**
 * AuthService - SSO 认证服务 (后端集成版本)
 * 所有认证逻辑由后端处理，前端只负责调用 API
 */

/**
 * 用户信息接口
 */
export interface UserInfo {
  userId: string;
  isAuthenticated: boolean;
}

/**
 * 回调检查结果接口
 */
export interface CallbackResult {
  success: boolean;
  error?: string;
}

/**
 * AuthService 类
 * 提供简化的认证功能，所有复杂逻辑由后端处理
 */
class AuthService {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * 发起登录
   * 重定向到后端登录端点，后端会处理 SSO 流程
   */
  initiateLogin(): void {
    console.log('Redirecting to backend login...');
    window.location.href = `${this.apiUrl}/api/auth/login`;
  }

  /**
   * 检查回调结果
   * 检查 URL 中是否有登录成功或失败的参数
   */
  checkCallback(): CallbackResult {
    const params = new URLSearchParams(window.location.search);

    // 检查登录成功
    if (params.get('login') === 'success') {
      console.log('Login callback: success');
      // 清理 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: true };
    }

    // 检查错误
    const error = params.get('error');
    if (error) {
      console.error('Login callback error:', error);
      // 清理 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: false, error };
    }

    // 没有回调参数
    return { success: false };
  }

  /**
   * 获取当前用户信息
   * 从后端 API 获取用户信息（通过 HttpOnly Cookie 认证）
   */
  async getCurrentUser(): Promise<UserInfo | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include', // 携带 Cookie
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated');
          return null;
        }
        console.error('Get current user failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data as UserInfo;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * 登出
   * 调用后端登出接口清除 Cookie
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // 携带 Cookie
      });

      if (!response.ok) {
        console.error('Logout request failed:', response.status);
      }

      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * 检查用户是否已登录
   * 通过调用 getCurrentUser 检查
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null && user.isAuthenticated;
  }
}

/**
 * 创建 AuthService 实例的工厂函数
 * @param apiUrl - API 服务地址
 * @returns AuthService 实例
 */
export function createAuthService(apiUrl: string): AuthService {
  return new AuthService(apiUrl);
}

export default AuthService;
