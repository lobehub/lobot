import type { CreateDocumentCommentInput, UpdateDocumentCommentInput } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class DocumentCommentService {
  create = (input: CreateDocumentCommentInput) => lambdaClient.documentComment.create.mutate(input);

  get = (id: string) => lambdaClient.documentComment.get.query({ id });

  listAnchors = (documentId: string) =>
    lambdaClient.documentComment.listAnchors.query({ documentId });

  listReplies = (params: { cursor?: string; limit?: number; rootCommentId: string }) =>
    lambdaClient.documentComment.listReplies.query(params);

  listThreads = (params: {
    anchored?: boolean;
    cursor?: string;
    documentId: string;
    limit?: number;
  }) => lambdaClient.documentComment.listThreads.query(params);

  summary = (documentId: string) => lambdaClient.documentComment.summary.query({ documentId });
}

export const documentCommentService = new DocumentCommentService();
