import { ApiResponse } from '../types';

/**
 * 错误类型定义
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 预定义的错误类型
 */
export const Errors = {
  BadRequest: (message: string) => new ApiError(400, 'BAD_REQUEST', message),
  Unauthorized: (message: string = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', message),
  Forbidden: (message: string = 'Forbidden') => new ApiError(403, 'FORBIDDEN', message),
  NotFound: (message: string) => new ApiError(404, 'NOT_FOUND', message),
  Conflict: (message: string) => new ApiError(409, 'CONFLICT', message),
  InternalError: (message: string = 'Internal server error') => new ApiError(500, 'INTERNAL_ERROR', message),
};

/**
 * 统一错误处理
 * 将错误转换为标准的 JSON 响应
 */
export function handleError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: error.message,
      code: error.code,
    };

    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 未知错误
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  return new Response(JSON.stringify(response), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * 错误处理包装器
 * 自动捕获异常并转换为错误响应
 */
export async function withErrorHandling(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return handleError(error);
  }
}
