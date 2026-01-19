import { Env, SSOVerifyResponse } from '../types';
import { parseCookies } from '../utils/cookie';

/**
 * Token 验证中间件 (纯 JWT Token 方案)
 * 优先1: 从 Cookie 读取 auth_token (主要方式)
 * 降级2: 从 Authorization header 读取 SSO token (API 调用支持)
 */
export async function verifyToken(request: Request, env: Env): Promise<{ userId: string } | null> {
  // 优先1: 从 Cookie 读取 auth_token
  const cookies = parseCookies(request.headers.get('Cookie'));
  let token = cookies['auth_token'];

  // 降级2: 从 Authorization header 读取 SSO token (API 调用支持)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // 移除 "Bearer " 前缀
    }
  }

  if (!token) {
    return null;
  }

  try {
    // 调用 SSO 服务验证 Token
    const response = await fetch(`${env.SSO_URL}/sso/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error('SSO verify failed:', response.status);
      return null;
    }

    const data: SSOVerifyResponse = await response.json();

    if (!data.valid || !data.user || !data.user.email) {
      return null;
    }

    return { userId: data.user.email };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * 认证中间件包装器
 * 自动验证 Token 并将 userId 注入到请求中
 */
export async function requireAuth(
  request: Request,
  env: Env,
  handler: (request: Request, env: Env, userId: string) => Promise<Response>
): Promise<Response> {
  const auth = await verifyToken(request, env);
  
  if (!auth) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return handler(request, env, auth.userId);
}
