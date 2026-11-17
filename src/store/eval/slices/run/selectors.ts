import type { AgentEvalRunListItem } from '@lobot/types';

import type { EvalStore } from '@/store/eval/store';

/** Stable empty array so a selector never returns a fresh reference on every read. */
const EMPTY_RUNS: AgentEvalRunListItem[] = [];

export const runSelectors = {};
