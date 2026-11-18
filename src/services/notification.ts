import { lambdaClient } from '@/libs/trpc/client';

class NotificationService {
  list = (
    params: {
      category?: string;
      cursor?: string;
      isRead?: boolean;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ) => {
    return lambdaClient.notification.list.query(params);
  };

  getNavigationCounts = () => {
    return lambdaClient.notification.navigationCounts.query();
  };
}

export const notificationService = new NotificationService();
