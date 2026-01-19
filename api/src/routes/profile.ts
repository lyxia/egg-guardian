import { Env, UserProfile, ApiResponse } from '../types';
import { jsonResponse } from '../utils/response';

/**
 * 数据库格式转换为 API 响应格式
 */
function formatProfileResponse(profile: UserProfile) {
  return {
    user_id: profile.user_id,
    balance: profile.balance,
    guardian_config: {
      weekly_base_salary: profile.weekly_base_salary,
      last_salary_date: profile.last_salary_date,
    },
    isMuted: profile.is_muted === 1,
    parentAuth: {
      isPasswordSet: profile.is_parent_password_set === 1,
    },
  };
}

/**
 * GET /api/profile - 获取用户资料
 */
export async function getProfile(
  userId: string,
  env: Env
): Promise<Response> {
  try {
    // 从 D1 数据库查询用户资料
    const stmt = env.DB.prepare(
      'SELECT * FROM user_profiles WHERE user_id = ?'
    );
    const result = await stmt.bind(userId).first<UserProfile>();

    // 处理用户不存在的情况
    if (!result) {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'User profile not found',
          code: 'NOT_FOUND',
        },
        404
      );
    }

    // 转换数据库格式为 API 响应格式
    const formattedProfile = formatProfileResponse(result);

    return jsonResponse<ApiResponse>({
      success: true,
      data: formattedProfile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

/**
 * PUT /api/profile - 更新用户资料
 */
export async function updateProfile(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 解析请求数据
    const body: any = await request.json();

    // 验证请求数据格式
    if (!body || typeof body !== 'object') {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'Invalid request body',
          code: 'BAD_REQUEST',
        },
        400
      );
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];

    if (typeof body.balance === 'number') {
      updates.push('balance = ?');
      values.push(body.balance);
    }

    if (body.guardian_config) {
      if (typeof body.guardian_config.weekly_base_salary === 'number') {
        updates.push('weekly_base_salary = ?');
        values.push(body.guardian_config.weekly_base_salary);
      }
      if (body.guardian_config.last_salary_date !== undefined) {
        updates.push('last_salary_date = ?');
        values.push(body.guardian_config.last_salary_date);
      }
    }

    if (typeof body.isMuted === 'boolean') {
      updates.push('is_muted = ?');
      values.push(body.isMuted ? 1 : 0);
    }

    // 如果没有需要更新的字段
    if (updates.length === 0) {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'No valid fields to update',
          code: 'BAD_REQUEST',
        },
        400
      );
    }

    // 更新 updated_at 时间戳
    updates.push('updated_at = ?');
    values.push(Date.now());

    // 添加 user_id 到参数列表
    values.push(userId);

    // 执行更新
    const sql = `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`;
    const stmt = env.DB.prepare(sql);
    await stmt.bind(...values).run();

    return jsonResponse<ApiResponse>({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * POST /api/profile/parent-password - 设置或更新家长密码
 */
export async function updateParentPassword(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 解析请求数据
    const body: any = await request.json();

    // 验证请求数据格式
    if (!body || typeof body.passwordHash !== 'string') {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'Invalid request body, passwordHash is required',
          code: 'BAD_REQUEST',
        },
        400
      );
    }

    // 更新数据库中的密码字段
    const stmt = env.DB.prepare(`
      UPDATE user_profiles 
      SET parent_password_hash = ?, 
          is_parent_password_set = 1,
          updated_at = ?
      WHERE user_id = ?
    `);

    await stmt.bind(body.passwordHash, Date.now(), userId).run();

    return jsonResponse<ApiResponse>({
      success: true,
      message: 'Parent password updated',
    });
  } catch (error) {
    console.error('Error updating parent password:', error);
    throw error;
  }
}

/**
 * POST /api/profile/verify-parent-password - 验证家长密码
 */
export async function verifyParentPassword(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 解析请求数据
    const body: any = await request.json();

    // 验证请求数据格式
    if (!body || typeof body.passwordHash !== 'string') {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'Invalid request body, passwordHash is required',
          code: 'BAD_REQUEST',
        },
        400
      );
    }

    // 从数据库查询用户的密码哈希
    const stmt = env.DB.prepare(
      'SELECT parent_password_hash, is_parent_password_set FROM user_profiles WHERE user_id = ?'
    );
    const result = await stmt.bind(userId).first<{
      parent_password_hash: string | null;
      is_parent_password_set: number;
    }>();

    // 用户不存在
    if (!result) {
      return jsonResponse<ApiResponse>(
        {
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND',
        },
        404
      );
    }

    // 密码未设置
    if (result.is_parent_password_set !== 1 || !result.parent_password_hash) {
      return jsonResponse<ApiResponse>({
        success: true,
        data: { isValid: false, isPasswordSet: false },
      });
    }

    // 验证密码
    const isValid = result.parent_password_hash === body.passwordHash;

    return jsonResponse<ApiResponse>({
      success: true,
      data: { isValid, isPasswordSet: true },
    });
  } catch (error) {
    console.error('Error verifying parent password:', error);
    throw error;
  }
}
