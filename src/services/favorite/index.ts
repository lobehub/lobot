import type { FavoriteItem } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class FavoriteService {
  list = (): Promise<FavoriteItem[]> => lambdaClient.favorite.list.query();

  update = async (
    id: string,
    value: Partial<Pick<FavoriteItem, 'icon' | 'path' | 'title'>>,
  ): Promise<void> => {
    await lambdaClient.favorite.update.mutate({ id, value });
  };
}

export const favoriteService = new FavoriteService();
