/**
 * Cookie utilities for parsing and serializing cookies
 */

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  path?: string;
  domain?: string;
}

/**
 * Parse Cookie header into an object
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  });

  return cookies;
}

/**
 * Serialize a cookie into Set-Cookie header value
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const {
    httpOnly = true,
    secure = true,
    sameSite = 'Lax',
    maxAge,
    path = '/',
    domain
  } = options;

  let cookie = `${name}=${value}`;

  if (path) {
    cookie += `; Path=${path}`;
  }

  if (domain) {
    cookie += `; Domain=${domain}`;
  }

  if (maxAge !== undefined) {
    cookie += `; Max-Age=${maxAge}`;
  }

  if (httpOnly) {
    cookie += '; HttpOnly';
  }

  if (secure) {
    cookie += '; Secure';
  }

  if (sameSite) {
    cookie += `; SameSite=${sameSite}`;
  }

  return cookie;
}

/**
 * Create a cookie for deleting (Max-Age=0)
 */
export function deleteCookie(name: string, path: string = '/'): string {
  return serializeCookie(name, '', {
    maxAge: 0,
    path,
    httpOnly: true,
    secure: getSecureFlag(),
    sameSite: 'Lax'
  });
}

/**
 * Get secure flag based on environment
 * In development with whistle proxy (HTTPS frontend -> HTTP backend),
 * we need secure: true for cookies to work on HTTPS pages
 */
function getSecureFlag(): boolean {
  // Always use secure cookies (works with whistle proxy)
  return true;
}

/**
 * Default cookie options for session tokens
 * Automatically adapts to development (whistle proxy) and production
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: getSecureFlag(),
  sameSite: 'Lax',
  maxAge: 86400, // 24 hours
  path: '/'
};

/**
 * Default cookie options for temporary state (e.g., SSO state)
 */
export const STATE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: getSecureFlag(),
  sameSite: 'Lax',
  maxAge: 300, // 5 minutes
  path: '/'
};
