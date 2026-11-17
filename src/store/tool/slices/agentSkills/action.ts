import type {
  CreateSkillInput,
  ImportGitHubInput,
  ImportUrlInput,
  ImportZipInput,
  SkillImportResult,
  UpdateSkillInput,
} from '@lobot/types';

import {
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { agentSkillService } from '@/services/skill';
import type { StoreSetter } from '@/store/types';

import type { ToolStore } from '../../store';
import { useToolStore } from '../../store';
import {
  AGENT_SKILL_LIST_KEY,
  type AgentSkillDetail,
  agentSkillDetailEntity,
  type AgentSkillDetailItem,
  agentSkillDetailResource,
  agentSkillListEntity,
  type AgentSkillListItem,
  agentSkillListResource,
} from './projection';
import { agentSkillsSelectors } from './selectors';

/** The skills list has a single entry; its params carry no filter. */
const LIST_PARAMS = {} as Record<string, never>;

/** Sync result of the skills list: replica flags plus the value the UI reads. */
interface AgentSkillsSyncResult extends ReplicaSyncResult {
  /** The installed skills, `undefined` until the first entry lands. */
  data: AgentSkillListItem[] | undefined;
  /** A request is in flight and there is nothing to show for this entry yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the existing "reload skills" controls. */
  mutate: () => Promise<unknown>;
}

/** Sync result of one skill detail page. */
interface AgentSkillDetailSyncResult extends ReplicaSyncResult {
  /** The detail value: the skill and its resource tree. */
  data: AgentSkillDetail | undefined;
  /** A request is in flight and there is nothing to show for this entry yet. */
  isLoading: boolean;
}

type Setter = StoreSetter<ToolStore>;

export const createAgentSkillsSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new AgentSkillsActionImpl(set, get, _api);

class AgentSkillsActionImpl {
  readonly #detail;
  readonly #list;

  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    this.#list = createReplicaSlice(agentSkillListResource, {
      actionPrefix: 'agentSkillList',
      entity: agentSkillListEntity,
      fetcher: () => agentSkillService.list(),
      get,
      merge: (response) => response.data,
      set,
      stateKey: 'agentSkillListReplica',
      view: recordLens<ToolStore, AgentSkillListItem[]>('agentSkillListMap'),
    });
    this.#detail = createReplicaSlice(agentSkillDetailResource, {
      actionPrefix: 'agentSkillDetail',
      entity: agentSkillDetailEntity,
      fetcher: (id) => this.#fetchDetail(id),
      get,
      set,
      stateKey: 'agentSkillDetailReplica',
      view: recordLens<ToolStore, AgentSkillDetail>('agentSkillDetailMap'),
    });
    linkReplicaEntity<AgentSkillListItem>([this.#list, this.#detail]);
  }

  #fetchDetail = async (id: string): Promise<AgentSkillDetail> => {
    const [skillDetail, resourceTree] = await Promise.all([
      agentSkillService.getById(id),
      agentSkillService.listResources(id, true),
    ]);
    return { resourceTree, skillDetail };
  };

  /**
   * Fetch the list and settle it into the replica. `refreshAgentSkills` is
   * also called from flows where the list hook is not mounted (installing a
   * suggested skill from the create-agent modal), and it must populate the
   * store regardless, so this does not just revalidate the SWR entry.
   *
   * It runs after mutations, so it never joins a request already in flight
   * (`fresh`): that one may hold the pre-mutation list. The replica drops a
   * response that resolves after an identity switch instead of writing (and
   * persisting) it into the next scope's partition.
   */
  #refreshList = async (): Promise<void> => {
    await this.#list.fetch(LIST_PARAMS, { fresh: true });
  };

  refreshAgentSkills = async (): Promise<void> => {
    await this.#refreshList();
  };

  /** Fetch orchestration only; read the rows through `agentSkillsSelectors`. */
  useFetchAgentSkills = (enabled: boolean): AgentSkillsSyncResult => {
    const sync = this.#list.useSync(LIST_PARAMS, { enabled });
    const data = useToolStore((s) => s.agentSkillListMap[AGENT_SKILL_LIST_KEY]);
    return {
      ...sync,
      data,
      isLoading: !data && (sync.isValidating || !sync.isHydrated),
      mutate: sync.revalidate,
    };
  };
}

export type AgentSkillsAction = Pick<AgentSkillsActionImpl, keyof AgentSkillsActionImpl>;
