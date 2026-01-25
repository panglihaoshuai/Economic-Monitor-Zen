// ============================================================================
// 📁 features/social/types.ts
// ============================================================================
// 社交功能类型定义
// ============================================================================
// ⚠️  预留功能 - 尚未实现

import type { Trade } from '@/shared/types';

// ============================================================================
// 用户
// ============================================================================

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  isVerified: boolean;
  createdAt: string;
}

// ============================================================================
// 公开交易
// ============================================================================

export interface PublicTrade {
  id: string;
  userId: string;
  user: SocialUser;
  trade: Trade;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: string;
}

// ============================================================================
// 关注/粉丝
// ============================================================================

export interface FollowRelationship {
  followerId: string;
  followingId: string;
  createdAt: string;
}

// ============================================================================
// 排行榜
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  user: SocialUser;
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  followers: number;
}

// ============================================================================
// 活动流
// ============================================================================

export interface ActivityFeed {
  items: ActivityItem[];
  nextCursor?: string;
  hasMore: boolean;
}

export type ActivityItem = 
  | PublicTradeActivity
  | FollowActivity
  | MilestoneActivity;

export interface PublicTradeActivity {
  type: 'public_trade';
  trade: PublicTrade;
}

export interface FollowActivity {
  type: 'follow';
  fromUser: SocialUser;
  toUser: SocialUser;
}

export interface MilestoneActivity {
  type: 'milestone';
  user: SocialUser;
  milestone: string;  // e.g., "100 trades", "50% win rate"
}

// ============================================================================
// 未来扩展
// ============================================================================

/**
 * TODO: 交易信号订阅
 * TODO: 跟单交易
 * TODO: 策略分享
 * TODO: 实时聊天
 * TODO: 社群功能
 */
