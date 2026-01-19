import { Env } from './types';
import { handleOptions, addCorsHeaders } from './middleware/cors';
import { withErrorHandling } from './middleware/error';
import { requireAuth } from './middleware/auth';
import { getProfile, updateProfile, updateParentPassword, verifyParentPassword } from './routes/profile';
import { handleLogin, handleCallback, handleMe, handleLogout } from './routes/auth';

/**
 * Cloudflare Workers 入口
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions(env);
    }

    // 路由处理
    const response = await withErrorHandling(async () => {
      const url = new URL(request.url);
      const path = url.pathname;
      console.log(`[DEBUG] ${request.method} ${path}`);

      // 健康检查
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 认证 API
      if (path === '/api/auth/login') {
        return handleLogin(request, env);
      }
      if (path === '/api/auth/callback') {
        return handleCallback(request, env);
      }
      if (path === '/api/auth/me') {
        return handleMe(request, env);
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        return handleLogout(request, env);
      }

      // 用户资料 API
      if (path === '/api/profile') {
        if (request.method === 'GET') {
          return requireAuth(request, env, (req, env, userId) =>
            getProfile(userId, env)
          );
        }
        if (request.method === 'PUT') {
          return requireAuth(request, env, (req, env, userId) =>
            updateProfile(userId, req, env)
          );
        }
      }

      // 家长密码 API
      if (path === '/api/profile/parent-password' && request.method === 'POST') {
        return requireAuth(request, env, (req, env, userId) =>
          updateParentPassword(userId, req, env)
        );
      }

      // 验证家长密码 API
      if (path === '/api/profile/verify-parent-password' && request.method === 'POST') {
        return requireAuth(request, env, (req, env, userId) =>
          verifyParentPassword(userId, req, env)
        );
      }

      // API 路由将在后续任务中实现
      if (path.startsWith('/api/')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'API endpoint not implemented yet',
            code: 'NOT_IMPLEMENTED',
          }),
          {
            status: 501,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 404
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    // 添加 CORS 头部
    return addCorsHeaders(response, env);
  },
};
