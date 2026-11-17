/**
 * Shared fixtures of the document detail replica suites (`action*.test.ts`):
 * the SWR provider with the app's scoped mutate, server-shaped rows and the
 * persisted-row reader.
 */
import type { PropsWithChildren } from 'react';
import { createElement, useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';

import { setScopedMutate } from '@/libs/swr/mutate';
import { initialEditorState } from '@/store/document/slices/editor';

import { initialDocumentDetailSliceState } from './initialState';
import { documentDetailResource } from './projection';

export const baseEditorData = {
  root: { children: [{ children: [], type: 'paragraph' }], type: 'root' },
};
