import { ApiResponse } from '../types';

/**
 * 创建 JSON 响应
 */
export function jsonResponse<T>(data: T, status: number = 200, additionalHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    },
  });
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * 创建消息响应
 */
export function messageResponse(message: string, status: number = 200): Response {
  const response: ApiResponse = {
    success: true,
    data: { message },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
