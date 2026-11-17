import type { EvalStore } from '@/store/eval/store';

import { type TestCaseListItem, type TestCaseListQuery, testCaseListQueryKey } from './projection';

/** Stable empty array so a selector never returns a fresh reference on every read. */
const EMPTY_TEST_CASES: TestCaseListItem[] = [];

export const testCaseSelectors = {};
