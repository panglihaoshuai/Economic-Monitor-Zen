// Rate limiting utility for API protection

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 默认配置：每分钟100次请求
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 100,
};

// 内存中的速率限制存储（生产环境建议使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 简单的内存速率限制器
 * 注意：生产环境应使用 Redis 等分布式存储
 */
export function rateLimit(request: Request, config: RateLimitConfig = DEFAULT_CONFIG): { success: boolean; remaining: number; resetTime: number } | null {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    // 新窗口或已过期
    const resetTime = now + config.windowMs;
    rateLimitStore.set(ip, { count: 1, resetTime });
    return { success: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * 创建带有速率限制的响应
 */
export function createRateLimitedResponse(request: Request, config?: RateLimitConfig): Response | null {
  const result = rateLimit(request, config);

  if (!result) return null;

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * 获取速率限制头部
 */
export function getRateLimitHeaders(result: { remaining: number; resetTime: number }): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}

/**
 * 严格的速率限制配置（用于敏感端点）
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 10, // 每分钟最多10次
};

/**
 * 分析端点的速率限制配置
 */
export const ANALYSIS_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 20, // 每分钟最多20次
};
