/**
 * Authentication routes for SSO callback handling
 */

import { Env, ApiResponse, SSOVerifyResponse } from '../types';
import { parseCookies, serializeCookie, deleteCookie, SESSION_COOKIE_OPTIONS } from '../utils/cookie';
import { jsonResponse } from '../utils/response';

/**
 * GET /api/auth/login
 * Initiate SSO login flow
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    console.log('Initiating SSO login...');

    // Construct SSO login URL
    const ssoUrl = new URL(`${env.SSO_URL}/sso/login`);
    ssoUrl.searchParams.set('redirect_uri', env.CALLBACK_URL);

    // Redirect to SSO
    return new Response(null, {
      status: 302,
      headers: {
        'Location': ssoUrl.toString()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=login_failed'
      }
    });
  }
}

/**
 * GET /api/auth/callback
 * Handle SSO callback
 */
export async function handleCallback(request: Request, env: Env): Promise<Response> {
  try {
    console.log('SSO callback received');

    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // Validate token parameter
    if (!token) {
      console.error('Missing token');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/?error=invalid_callback'
        }
      });
    }

    // Verify token with SSO service
    const verifyResponse = await fetch(`${env.SSO_URL}/sso/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!verifyResponse.ok) {
      console.error('SSO verification failed:', verifyResponse.status);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/?error=auth_failed'
        }
      });
    }

    const verifyData: SSOVerifyResponse = await verifyResponse.json();

    // Debug: Log the actual SSO response
    console.log('SSO verify response:', JSON.stringify(verifyData));

    if (!verifyData.valid || !verifyData.user || !verifyData.user.email) {
      console.error('Invalid SSO response');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/?error=auth_failed'
        }
      });
    }

    // Use email as userId (unique identifier)
    const userId = verifyData.user.email;
    console.log('Token verified for user:', userId);

    // Check if user exists in database
    const existingUser = await env.DB.prepare(
      'SELECT user_id FROM user_profiles WHERE user_id = ?'
    ).bind(userId).first();

    // Create user if doesn't exist (first time login)
    if (!existingUser) {
      console.log('Creating new user:', userId);
      const now = Date.now();
      await env.DB.prepare(`
        INSERT INTO user_profiles (
          user_id, balance, weekly_base_salary,
          is_muted, is_parent_password_set,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        0,          // Initial balance 0
        4000,       // Default weekly salary 4000
        0,          // Not muted
        0,          // Parent password not set
        now,
        now
      ).run();
      console.log('New user created successfully');
    }

    console.log('Authentication successful for user:', userId);

    // Set auth_token cookie (pure JWT approach)
    const authCookie = serializeCookie('auth_token', token, SESSION_COOKIE_OPTIONS);

    // Redirect to frontend with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?login=success',
        'Set-Cookie': authCookie
      }
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=callback_failed'
      }
    });
  }
}

/**
 * GET /api/auth/me
 * Get current user information
 */
export async function handleMe(request: Request, env: Env): Promise<Response> {
  try {
    // Parse cookies
    const cookies = parseCookies(request.headers.get('Cookie'));
    const token = cookies['auth_token'];

    if (!token) {
      return jsonResponse<ApiResponse>({
        success: false,
        error: 'Not authenticated',
        code: 'NO_TOKEN'
      }, 401);
    }

    // Verify token with SSO service
    const verifyResponse = await fetch(`${env.SSO_URL}/sso/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!verifyResponse.ok) {
      console.error('SSO verification failed:', verifyResponse.status);
      return jsonResponse<ApiResponse>({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }, 401);
    }

    const verifyData: SSOVerifyResponse = await verifyResponse.json();

    if (!verifyData.valid || !verifyData.user || !verifyData.user.email) {
      return jsonResponse<ApiResponse>({
        success: false,
        error: 'Invalid token data',
        code: 'INVALID_TOKEN_DATA'
      }, 401);
    }

    // Return user info
    return jsonResponse<ApiResponse>({
      success: true,
      data: {
        userId: verifyData.user.email,
        isAuthenticated: true
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return jsonResponse<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}

/**
 * POST /api/auth/logout
 * Logout user
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    // Get auth token from cookie
    const cookies = parseCookies(request.headers.get('Cookie'));
    const token = cookies['auth_token'];

    // Optionally call SSO logout if token exists
    if (token) {
      try {
        await fetch(`${env.SSO_URL}/sso/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });
        console.log('SSO logout called successfully');
      } catch (error) {
        console.error('SSO logout failed:', error);
        // Continue with local logout even if SSO logout fails
      }
    }

    // Clear auth_token cookie
    const clearCookie = deleteCookie('auth_token');

    return jsonResponse<ApiResponse>({
      success: true,
      message: 'Logged out successfully'
    }, 200, {
      'Set-Cookie': clearCookie
    });
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse<ApiResponse>({
      success: false,
      error: 'Logout failed'
    }, 500);
  }
}
