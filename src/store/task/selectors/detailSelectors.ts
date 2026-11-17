import { isHeterogeneousAgentModelId } from '@lobechat/const';
import type { HeterogeneousProviderConfig, TaskDetailData, TaskVerifyConfig } from '@lobot/types';
import { isTaskArchiveBlocked, resolveHeterogeneousRuntimeConfig } from '@lobot/types';

import type { SaveStatus } from '@/types/saveState';

import type { TaskStoreState } from '../initialState';

const EMPTY_LABELS: NonNullable<TaskDetailData['labels']> = [];

export const taskDetailSelectors = {};
