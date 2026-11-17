import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { agentDocumentService } from '@/services/agentDocument';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import {
  type AgentDocumentSkillItem,
  agentDocumentSkillsResource,
  mapDocsToSkills,
} from './projection';

const n = setNamespace('agentDocumentSkills');

type Setter = StoreSetter<ToolStore>;

export const createAgentDocumentSkillsSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new AgentDocumentSkillsActionImpl(set, get, _api);

class AgentDocumentSkillsActionImpl {
  readonly #skills;

  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    this.#skills = createReplicaSlice(agentDocumentSkillsResource, {
      actionPrefix: n('agentDocumentSkills'),
      // The slash menu never renders web-clip docs, so the hot-path list drops
      // the unbounded `sourceType: 'web'` rows the full document list carries.
      fetcher: (agentId) => agentDocumentService.listDocuments({ agentId, excludeWeb: true }),
      get,
      merge: (docs) => mapDocsToSkills(docs),
      set,
      stateKey: 'agentDocumentSkillsReplica',
      view: recordLens<ToolStore, AgentDocumentSkillItem[]>('agentDocumentSkillsMap'),
    });
  }

  /**
   * Fetch orchestration for the slash menu: one replica entry per agent, so an
   * agent switch paints the cached bundles immediately and the network only
   * confirms. Read the items with `agentDocumentSkillsSelectors`, not from the
   * return value.
   */
  useFetchAgentDocumentSkills = (agentId: string | undefined): ReplicaSyncResult =>
    this.#skills.useSync(agentId ?? null, { revalidateOnFocus: false });
}

export type AgentDocumentSkillsAction = Pick<
  AgentDocumentSkillsActionImpl,
  keyof AgentDocumentSkillsActionImpl
>;
