import { lambdaClient } from '@/libs/trpc/client';

export type SocialTargetType = 'agent' | 'plugin' | 'agent-group';

export interface FollowStatus {
  isFollowing: boolean;
  isMutual: boolean;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

export interface FavoriteStatus {
  isFavorited: boolean;
}

interface LikeStatus {
  isLiked: boolean;
}

interface ToggleLikeResult {
  liked: boolean;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  items: T[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FollowUserItem {
  avatarUrl: string | null;
  displayName: string | null;
  id: number;
  namespace: string;
  userName: string | null;
}

interface FavoriteItem {
  createdAt: string;
  id: number;
  targetId: number;
  targetType: SocialTargetType;
}

export interface FavoriteAgentItem {
  avatar: string;
  category: string;
  createdAt: string;
  description: string;
  identifier: string;
  installCount?: number;
  name: string;
  tags: string[];
}

export interface FavoritePluginItem {
  avatar: string;
  category: string;
  createdAt: string;
  description: string;
  identifier: string;
  name: string;
  tags: string[];
}

class SocialService {
  async checkFollowStatus(userId: number): Promise<FollowStatus> {
    return lambdaClient.market.social.checkFollowStatus.query({
      targetUserId: userId,
    }) as Promise<FollowStatus>;
  }

  async getFollowCounts(userId: number): Promise<FollowCounts> {
    return lambdaClient.market.social.getFollowCounts.query({
      userId,
    }) as Promise<FollowCounts>;
  }

  async getFollowing(
    userId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<FollowUserItem>> {
    return lambdaClient.market.social.getFollowing.query({
      limit: params?.pageSize,
      offset: params?.page ? (params.page - 1) * (params.pageSize || 10) : undefined,
      userId,
    }) as unknown as Promise<PaginatedResponse<FollowUserItem>>;
  }

  async getFollowers(
    userId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<FollowUserItem>> {
    return lambdaClient.market.social.getFollowers.query({
      limit: params?.pageSize,
      offset: params?.page ? (params.page - 1) * (params.pageSize || 10) : undefined,
      userId,
    }) as unknown as Promise<PaginatedResponse<FollowUserItem>>;
  }

  async checkFavoriteStatus(
    targetType: SocialTargetType,
    targetIdOrIdentifier: number | string,
  ): Promise<FavoriteStatus> {
    return lambdaClient.market.social.checkFavorite.query({
      targetIdOrIdentifier,
      targetType,
    }) as Promise<FavoriteStatus>;
  }

  async getUserFavoriteAgents(
    userId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<FavoriteAgentItem>> {
    return lambdaClient.market.social.getUserFavoriteAgents.query({
      limit: params?.pageSize,
      offset: params?.page ? (params.page - 1) * (params.pageSize || 10) : undefined,
      userId,
    }) as unknown as Promise<PaginatedResponse<FavoriteAgentItem>>;
  }

  async getUserFavoritePlugins(
    userId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<FavoritePluginItem>> {
    return lambdaClient.market.social.getUserFavoritePlugins.query({
      limit: params?.pageSize,
      offset: params?.page ? (params.page - 1) * (params.pageSize || 10) : undefined,
      userId,
    }) as unknown as Promise<PaginatedResponse<FavoritePluginItem>>;
  }
}

export const socialService = new SocialService();
