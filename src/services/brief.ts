import { lambdaClient } from '@/libs/trpc/client';

class BriefService {
  listUnresolved = async () => {
    return lambdaClient.brief.listUnresolved.query();
  };
}

export const briefService = new BriefService();
