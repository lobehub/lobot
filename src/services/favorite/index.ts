import type { FavoriteItem, FavoriteType } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class FavoriteService {
  list = (): Promise<FavoriteItem[]> => lambdaClient.favorite.list.query();

  removeByTarget = async (type: FavoriteType, targetId: string): Promise<void> => {
    await lambdaClient.favorite.removeByTarget.mutate({ targetId, type });
  };

  reorder = async (ids: string[]): Promise<void> => {
    await lambdaClient.favorite.reorder.mutate({ ids });
  };

  update = async (
    id: string,
    value: Partial<Pick<FavoriteItem, 'icon' | 'path' | 'title'>>,
  ): Promise<void> => {
    await lambdaClient.favorite.update.mutate({ id, value });
  };
}

export const favoriteService = new FavoriteService();
