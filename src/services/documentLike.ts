import { lambdaClient } from '@/libs/trpc/client';

class DocumentLikeService {
  summary = (documentId: string) => lambdaClient.documentLike.summary.query({ documentId });
}

export const documentLikeService = new DocumentLikeService();
