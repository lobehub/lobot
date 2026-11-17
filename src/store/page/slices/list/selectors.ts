import { useGlobalStore } from '@/store/global';
import { type LobeDocument } from '@/types/document';

import type { PageState } from '../../initialState';
import { PAGE_LIST_KEY } from '../../projection';

const EMPTY_DOCUMENTS: LobeDocument[] = [];

export const listSelectors = {};
