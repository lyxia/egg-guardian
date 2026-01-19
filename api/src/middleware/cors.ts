import { Env } from '../types';

/**
 * CORS 处理中间件
 * 添加必要的 CORS 头部
 */
export function getCorsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 处理 OPTIONS 预检请求
 */
export function handleOptions(env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(env),
  });
}

/**
 * 为响应添加 CORS 头部
 */
export function addCorsHeaders(response: Response, env: Env): Response {
  const newHeaders = new Headers(response.headers);
  const corsHeaders = getCorsHeaders(env);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
