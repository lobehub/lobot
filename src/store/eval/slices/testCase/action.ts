import {
  createReplicaSlice,
  recordLens,
  type ReplicaLens,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  datasetIdOfPageKey,
  type TestCaseDetail,
  testCaseDetailResource,
  type TestCaseListQuery,
  testCaseListQueryKey,
  testCaseListResource,
  type TestCaseListValue,
} from './projection';

const n = setNamespace('evalTestCase');

type Setter = StoreSetter<EvalStore>;

/** Pre-migration `useFetchTestCase` return shape, backed by the detail replica. */
interface TestCaseDetailSyncResult {
  /** The case once it has settled (hydrated or fetched), else `undefined`. */
  data: TestCaseDetail | undefined;
  error: unknown;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call site. */
  mutate: () => Promise<unknown>;
}

/**
 * Where the case pages live, plus the dataset count derived from them.
 *
 * Every committed page — hydrated from storage or answered by the network —
 * refreshes its dataset's count in the SAME commit. Keeping it derived means a
 * page restored from IndexedDB publishes its cached total too; without that,
 * switching from a hydrated page to a page with no local copy yet would fall
 * back to a count nobody wrote and collapse the pager to 0.
 */
const testCasePageLens: ReplicaLens<EvalStore, TestCaseListValue> = {
  clear: () => ({ testCaseListMap: {}, testCaseTotalMap: {} }),
  get: (state, key) => state.testCaseListMap[key],
  keys: (state) => Object.keys(state.testCaseListMap),
  set: (state, key, data) => {
    const testCaseListMap = { ...state.testCaseListMap };
    let testCaseTotalMap = state.testCaseTotalMap;
    if (data === undefined) {
      delete testCaseListMap[key];
    } else {
      testCaseListMap[key] = data;
      const datasetId = datasetIdOfPageKey(key);
      if (datasetId) testCaseTotalMap = { ...testCaseTotalMap, [datasetId]: data.total };
    }
    return { testCaseListMap, testCaseTotalMap };
  },
};

export const createTestCaseSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new TestCaseActionImpl(set, get, _api);

class TestCaseActionImpl {
  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;

    // Two local-first resources over the test-case entity, each owning ONE store
    // location (selectors keep reading those maps):
    // - `#list`: the visited case pages → `testCaseListMap[pageKey]`, with the
    //   dataset counts derived into `testCaseTotalMap`
    // - `#detail`: a case addressed by id → `testCaseDetailMap[id]`
    createReplicaSlice(testCaseListResource, {
      actionPrefix: n('testCaseList'),
      fetcher: ({ datasetId, limit, offset }) =>
        agentEvalService.listTestCases({ datasetId, limit, offset }),
      get,
      merge: (response) => ({ items: response.data, total: response.total }),
      set,
      stateKey: 'testCaseListReplica',
      view: testCasePageLens,
    });
    createReplicaSlice(testCaseDetailResource, {
      actionPrefix: n('testCaseDetail'),
      fetcher: (id) => agentEvalService.getTestCase(id),
      get,
      set,
      stateKey: 'testCaseDetailReplica',
      view: recordLens<EvalStore, TestCaseDetail>('testCaseDetailMap'),
    });
  }
}

export type TestCaseAction = Pick<TestCaseActionImpl, keyof TestCaseActionImpl>;
