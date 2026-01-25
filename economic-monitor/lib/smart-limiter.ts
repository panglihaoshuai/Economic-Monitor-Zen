/**
 * 智能限速器 - Token Bucket算法
 * 支持动态调整API请求间隔，最大化FRED API利用率
 * 支持120 requests/minute的免费版限制
 */

export interface RateLimiterConfig {
  maxTokens: number;           // 最大令牌数
  refillRate: number;          // 每秒补充的令牌数
  maxBurstRequests: number;    // 最大突发请求数
  initialTokens?: number;      // 初始令牌数
}

export interface RateLimiterStatus {
  availableTokens: number;
  queuedRequests: number;
  isRefilling: boolean;
  lastRefillTime: number;
  requestCount: number;
}

export class TokenBucketLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private refillTimer: NodeJS.Timeout | null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isRefilling: boolean = false;

  constructor(config: RateLimiterConfig = {
    maxTokens: 120,
    refillRate: 2, // 120 tokens per minute = 2 per second
    maxBurstRequests: 10,
    initialTokens: 120
  }) {
    this.config = config;
    this.tokens = config.initialTokens || config.maxTokens;
    this.lastRefill = Date.now();
    this.isRefilling = false;
    this.refillTimer = null;
  }

  /**
   * 获取令牌（核心方法）
   */
  async acquireToken(): Promise<number> {
    await this.refillIfNeeded();
    
    if (this.tokens <= 0) {
      console.log(`⏳️ 等待令牌补充中...`);
      await this.waitForToken();
    }
    
    return --this.tokens;
  }

  /**
   * 释放令牌
   */
  releaseToken(): void {
    this.tokens++;
    console.log(`🔓 释放令牌，剩余: ${this.tokens}`);
  }

  /**
   * 强制获取令牌（紧急情况）
   */
  forceAcquireToken(): number {
    return --this.tokens - 1;
  }

  /**
   * 等待令牌可用
   */
  private async waitForToken(): Promise<void> {
    while (this.tokens <= 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.refillIfNeeded();
    }
  }

  /**
   * 包装API调用
   */
  async executeWithLimiting<T>(
    requestFn: () => Promise<T>, 
    requestDescription: string
  ): Promise<T> {
    try {
      // 获取令牌
      await this.acquireToken();
      
      // 执行请求
      console.log(`🚀 执行请求: ${requestDescription}`);
      const result = await requestFn();
      
      // 释放令牌
      this.releaseToken();
      
      return result;
      
    } catch (error) {
      // 释放令牌
      this.releaseToken();
      throw error;
    }
  }

  /**
   * 批量执行
   */
  async executeBatch<T>(
    requests: Array<() => Promise<T>>,
    requestDescription: string,
    options: {
      maxConcurrency?: number;
      timeout?: number;
    } = {}
  ): Promise<Array<T>> {
    const maxConcurrency = options.maxConcurrency || 3;
    const results: Array<T> = [];
    const errors: Array<Error> = [];
    
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      
      console.log(`📊 执行批次 ${Math.floor(i / maxConcurrency + 1)}/${Math.ceil(requests.length / maxConcurrency)} (${batch.length} 个请求)`);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(req => this.executeWithLimiting(req, `${requestDescription} - Item ${i}`))
        );
          
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results[i + index] = result.value;
          } else {
            errors.push(result.reason);
            console.error(`❌ 请求失败: ${result.reason}`);
          }
        });
        
        console.log(`✅ 批次 ${Math.floor(i / maxConcurrency + 1)}/${Math.ceil(requests.length / maxConcurrency)} 完成: ${batchResults.filter(r => r.status === 'fulfilled').length}/${batchResults.length} 成功`);
        
      } catch (error) {
        console.error(`❌ 批次执行失败: ${(error as Error).message}`);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * 补充令牌
   */
  private async refillIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000 * this.config.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokens + tokensToAdd, this.config.maxTokens);
      this.lastRefill = now;
      console.log(`💰 补充 ${tokensToAdd} 个令牌，当前: ${this.tokens}/${this.config.maxTokens}`);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): RateLimiterStatus {
    return {
      availableTokens: this.tokens,
      queuedRequests: this.requestQueue.length,
      isRefilling: this.isRefilling,
      lastRefillTime: this.lastRefill,
      requestCount: this.requestQueue.length,
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
    this.requestQueue = [];
    this.isRefilling = false;
  }
}

/**
 * 创建智能限速器实例
 */
export function createSmartLimiter(config?: Partial<RateLimiterConfig>): TokenBucketLimiter {
  const defaultConfig: RateLimiterConfig = {
    maxTokens: 120,
    refillRate: 2, // 120 requests per minute for FRED free tier
    maxBurstRequests: 10,
    initialTokens: 120
  };

  return new TokenBucketLimiter({ ...defaultConfig, ...config });
}

/**
 * FRED API专用限速器
 */
export function createFREDLimiter(): TokenBucketLimiter {
  return createSmartLimiter({
    maxTokens: 120,           // FRED免费版每分钟120次
    refillRate: 2,            // 每秒2个令牌
    maxBurstRequests: 10,     // 最大突发10个请求
    initialTokens: 120        // 开始时满令牌
  });
}