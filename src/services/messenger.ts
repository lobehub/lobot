import type { MessengerOversizeImageStrategy } from '@lobechat/const';

import { lambdaClient } from '@/libs/trpc/client';

type MessengerPlatform = 'telegram' | 'slack' | 'discord' | 'wechat' | 'linq';

class MessengerService {
  availablePlatforms = async () => {
    return lambdaClient.messenger.availablePlatforms.query();
  };

  listAgentsForBinding = async (workspaceId?: string | null) => {
    return lambdaClient.messenger.listAgentsForBinding.query({ workspaceId: workspaceId ?? null });
  };

  listBindingScopes = async () => {
    return lambdaClient.messenger.listBindingScopes.query();
  };

  listMyLinks = async () => {
    return lambdaClient.messenger.listMyLinks.query();
  };

  listMyInstallations = async () => {
    return lambdaClient.messenger.listMyInstallations.query();
  };

  getMessengerPushWindow = async (platform: MessengerPlatform, tenantId?: string) => {
    return lambdaClient.messenger.getMessengerPushWindow.query({ platform, tenantId });
  };
}

export const messengerService = new MessengerService();
