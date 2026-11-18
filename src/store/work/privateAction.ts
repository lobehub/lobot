import type { WorkListItem, WorkSummaryItem, WorkVersionItem } from '@lobot/types';

import {
  arrayEntity,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaPageResult,
} from '@/libs/replica';
import { shareChatService } from '@/services/shareChat';
import { workService } from '@/services/work';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import type { WorkspaceWorksData, WorkState } from './initialState';
import {
  AGENT_WORKS_LIMIT,
  agentWorksResource,
  conversationWorksResource,
  type ShareVisitorDocument,
  shareVisitorDocumentResource,
  toPersistedVersions,
  WORKSPACE_WORKS_PAGE_SIZE,
  type WorkspaceWorksParams,
  workspaceWorksResource,
  workVersionsResource,
} from './projection';

const n = setNamespace('work');

type Setter = StoreSetter<WorkState>;

const workId = (item: { id: string }) => item.id;

export class WorkPrivateAction {
  readonly agentWorks;
  readonly conversationWorks;
  readonly shareVisitorDocument;
  readonly versions;
  readonly workspaceWorks;
  /** One Work card everywhere it is listed: gallery, project dashboard, sidebar history. */
  readonly works;

  constructor(set: Setter, get: () => WorkState) {
    this.workspaceWorks = createReplicaSlice(workspaceWorksResource, {
      actionPrefix: n('workspaceWorks'),
      fetcher: this.#fetchWorkspacePage,
      get,
      set,
      stateKey: 'workspaceWorksReplica',
      view: recordLens<WorkState, WorkspaceWorksData>('workspaceWorksMap'),
    });
    this.agentWorks = createReplicaSlice(agentWorksResource, {
      actionPrefix: n('agentWorks'),
      entity: arrayEntity<WorkSummaryItem>(workId),
      fetcher: async ({ originAgentId }) => {
        const { items } = await workService.listByWorkspace({
          limit: AGENT_WORKS_LIMIT,
          originAgentId,
        });
        return items;
      },
      get,
      set,
      stateKey: 'agentWorksReplica',
      view: recordLens<WorkState, WorkSummaryItem[]>('agentWorksMap'),
    });
    this.conversationWorks = createReplicaSlice(conversationWorksResource, {
      actionPrefix: n('conversationWorks'),
      entity: arrayEntity<WorkListItem>(workId),
      fetcher: ({ threadId, topicId }) => workService.listByConversation({ threadId, topicId }),
      get,
      set,
      stateKey: 'conversationWorksReplica',
      view: recordLens<WorkState, WorkListItem[]>('conversationWorksMap'),
    });
    this.shareVisitorDocument = createReplicaSlice(shareVisitorDocumentResource, {
      actionPrefix: n('shareVisitorDocument'),
      fetcher: ({ documentId, shareId, topicId }) =>
        shareChatService.getDocument(shareId, topicId, documentId),
      get,
      set,
      stateKey: 'shareVisitorDocumentReplica',
      view: recordLens<WorkState, ShareVisitorDocument>('shareVisitorDocumentMap'),
    });
    this.versions = createReplicaSlice(workVersionsResource, {
      actionPrefix: n('versions'),
      fetcher: ({ workId }) => workService.listVersions(workId),
      get,
      set,
      stateKey: 'workVersionsReplica',
      toPersisted: toPersistedVersions,
      view: recordLens<WorkState, WorkVersionItem[]>('workVersionsMap'),
    });
    this.works = linkReplicaEntity<WorkSummaryItem | WorkListItem>([
      this.workspaceWorks,
      this.agentWorks,
      this.conversationWorks,
    ]);
  }

  /** One gallery page: `cursor` undefined = the head (newest first). */
  #fetchWorkspacePage = async (
    { provider, type, visibility }: WorkspaceWorksParams,
    cursor?: string,
  ): Promise<ReplicaPageResult<WorkSummaryItem, string>> => {
    const { items, nextCursor } = await workService.listByWorkspace({
      cursor,
      limit: WORKSPACE_WORKS_PAGE_SIZE,
      provider,
      type: type ?? null,
      visibility,
    });
    return { items, nextCursor };
  };
}
