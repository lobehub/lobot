import { cacheScope, createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { subscribeCacheScope } from '@/libs/replica/cacheScopeEvents';
import {
  type ExpertiseDomainDetail,
  type ExpertiseLessonDetail,
  type ExpertiseOverview,
  expertiseService,
  type RuleRevision,
  type RuleSource,
  type RulesOverview,
} from '@/services/expertise';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type ExpertiseState, initialState } from './initialState';
import {
  expertiseDomainResource,
  type ExpertiseHistoryCount,
  expertiseHistoryCountResource,
  expertiseLessonResource,
  expertiseOverviewResource,
  expertiseRuleRevisionsResource,
  expertiseRuleSourcesResource,
  expertiseRulesResource,
  RULES_KEY,
} from './projection';
import { useExpertiseStore } from './store';

const n = setNamespace('expertise');

type Setter = StoreSetter<ExpertiseState>;

/**
 * The portrait is read by the page header, the warm-up hook and the habit list
 * at once, and a lesson by its hover preview and its page: one request answers
 * every mounted reader. Explicit revalidations (retry, after a write) are not
 * deduped.
 */
const EXPERTISE_DEDUPE_MS = 10_000;

const SYNC_OPTIONS = { dedupingInterval: EXPERTISE_DEDUPE_MS };

const withoutKey = (map: Record<string, true>, key: string): Record<string, true> => {
  if (!map[key]) return map;
  const next = { ...map };
  delete next[key];
  return next;
};

class ExpertiseActionImpl {
  readonly #domain;
  readonly #get: () => ExpertiseState;
  readonly #historyCount;
  readonly #lesson;
  readonly #overview;
  readonly #ruleRevisions;
  readonly #ruleSources;
  readonly #rules;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ExpertiseState) {
    this.#set = set;
    this.#get = get;

    this.#rules = createReplicaSlice(expertiseRulesResource, {
      actionPrefix: n('rules'),
      fetcher: () => expertiseService.listRules(),
      get,
      set,
      stateKey: 'rulesReplica',
      view: recordLens<ExpertiseState, RulesOverview>('rulesMap'),
    });
    this.#ruleSources = createReplicaSlice(expertiseRuleSourcesResource, {
      actionPrefix: n('ruleSources'),
      fetcher: (lessonId) => expertiseService.ruleSources(lessonId),
      get,
      set,
      stateKey: 'ruleSourcesReplica',
      view: recordLens<ExpertiseState, RuleSource[]>('ruleSourcesMap'),
    });
    this.#ruleRevisions = createReplicaSlice(expertiseRuleRevisionsResource, {
      actionPrefix: n('ruleRevisions'),
      fetcher: (lessonId) => expertiseService.ruleRevisions(lessonId),
      get,
      set,
      stateKey: 'ruleRevisionsReplica',
      view: recordLens<ExpertiseState, RuleRevision[]>('ruleRevisionsMap'),
    });
    this.#overview = createReplicaSlice(expertiseOverviewResource, {
      actionPrefix: n('overview'),
      fetcher: (agentId) => expertiseService.listByAgent(agentId),
      get,
      set,
      stateKey: 'overviewReplica',
      view: recordLens<ExpertiseState, ExpertiseOverview>('overviewMap'),
    });
    this.#domain = createReplicaSlice(expertiseDomainResource, {
      actionPrefix: n('domain'),
      fetcher: (domainId) => expertiseService.getDomain(domainId),
      get,
      // `null` is a direction that is gone: drop the entry and its persisted row.
      isMissing: (incoming) => !incoming,
      merge: (incoming) => incoming ?? undefined,
      set,
      stateKey: 'domainReplica',
      view: recordLens<ExpertiseState, ExpertiseDomainDetail>('domainMap'),
    });
    this.#lesson = createReplicaSlice(expertiseLessonResource, {
      actionPrefix: n('lesson'),
      effects: {
        onApplied: (_detail, lessonId) => this.#setLessonNotFound(lessonId, false),
        onMissing: (lessonId) => this.#setLessonNotFound(lessonId, true),
      },
      fetcher: (lessonId) => expertiseService.getLesson(lessonId),
      get,
      isMissing: (incoming) => !incoming,
      merge: (incoming) => incoming ?? undefined,
      set,
      stateKey: 'lessonReplica',
      view: recordLens<ExpertiseState, ExpertiseLessonDetail>('lessonMap'),
    });
    this.#historyCount = createReplicaSlice(expertiseHistoryCountResource, {
      actionPrefix: n('historyCount'),
      fetcher: (agentId) => expertiseService.countHistory(agentId),
      get,
      set,
      stateKey: 'historyCountReplica',
      view: recordLens<ExpertiseState, ExpertiseHistoryCount>('historyCountMap'),
    });

    // The not-found map is not a replica: a scope switch must not carry one
    // workspace's "gone" over to another that may own the same id.
    subscribeCacheScope(this.#forgetNotFoundOnScopeChange);
  }

  reset = (): void => {
    // `clear()` drops in-flight reads of the previous data context and this
    // scope's persisted rows, so a new identity never paints the old sheet.
    for (const slice of [
      this.#domain,
      this.#historyCount,
      this.#lesson,
      this.#overview,
      this.#ruleRevisions,
      this.#ruleSources,
      this.#rules,
    ]) {
      void slice.clear();
    }
    this.#set(initialState, false, n('reset'));
  };

  #setLessonNotFound = (lessonId: string, notFound: boolean): void => {
    const current = this.#get().lessonNotFoundMap;
    if (notFound === !!current[lessonId]) return;
    this.#set(
      {
        lessonNotFoundMap: notFound
          ? { ...current, [lessonId]: true }
          : withoutKey(current, lessonId),
      },
      false,
      n('setLessonNotFound'),
    );
  };

  #forgetNotFoundOnScopeChange = (): void => {
    if (Object.keys(this.#get().lessonNotFoundMap).length === 0) return;
    this.#set({ lessonNotFoundMap: {} }, false, n('scopeChanged'));
  };
}

const { getState, setState } = useExpertiseStore;

export const expertiseActions = new ExpertiseActionImpl(setState, getState);
