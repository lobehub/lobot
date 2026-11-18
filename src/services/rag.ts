import { lambdaClient } from '@/libs/trpc/client';

class RAGService {
  parseFileContent = async (id: string, skipExist?: boolean) => {
    return lambdaClient.document.parseFileContent.mutate({ id, skipExist });
  };

  createParseFileTask = async (id: string, skipExist?: boolean) => {
    return lambdaClient.chunk.createParseFileTask.mutate({ id, skipExist });
  };
}

export const ragService = new RAGService();
