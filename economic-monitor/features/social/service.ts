// ============================================================================
// 📁 features/social/service.ts
// ============================================================================
// 社交服务 - 预留
// ============================================================================
// ⚠️  尚未实现 - 等待功能开发

import type { SocialUser, PublicTrade, ActivityFeed, LeaderboardEntry } from './types';

/**
 * 社交服务
 * 
 * 功能规划：
 * - 用户关注/粉丝
 * - 公开交易分享
 * - 活动流
 * - 排行榜
 * - 跟单交易
 * - 策略分享
 */
export class SocialService {
  /**
   * 获取用户资料
   */
  async getUser(userId: string): Promise<SocialUser | null> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 获取用户公开交易
   */
  async getPublicTrades(userId: string, limit?: number): Promise<PublicTrade[]> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 关注用户
   */
  async followUser(userId: string): Promise<boolean> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 取消关注
   */
  async unfollowUser(userId: string): Promise<boolean> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 获取活动流
   */
  async getActivityFeed(limit?: number, cursor?: string): Promise<ActivityFeed> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(period: 'week' | 'month' | 'all', limit?: number): Promise<LeaderboardEntry[]> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 点赞交易
   */
  async likeTrade(tradeId: string): Promise<boolean> {
    throw new Error('Social feature not implemented yet');
  }

  /**
   * 取消点赞
   */
  async unlikeTrade(tradeId: string): Promise<boolean> {
    throw new Error('Social feature not implemented yet');
  }
}

// ============================================================================
// 服务工厂
// ============================================================================

let socialServiceInstance: SocialService | null = null;

export function getSocialService(): SocialService {
  if (!socialServiceInstance) {
    socialServiceInstance = new SocialService();
  }
  return socialServiceInstance;
}
