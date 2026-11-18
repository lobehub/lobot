import type { AGENT_PLAN_FILE_TYPE } from '@lobechat/const';
import { type NotebookDocumentType as DocumentType } from '@lobechat/const/builtinTools';

import { lambdaClient } from '@/libs/trpc/client';

type ExtendedDocumentType = DocumentType | typeof AGENT_PLAN_FILE_TYPE;

interface ListDocumentsParams {
  topicId: string;
  type?: ExtendedDocumentType;
}

class NotebookService {
  listDocuments = async (params: ListDocumentsParams) => {
    return lambdaClient.notebook.listDocuments.query(params);
  };
}

export const notebookService = new NotebookService();
