import type {
  UserMemoryContextWithoutVectors,
  UserMemoryPreferenceWithoutVectors,
} from '@lobechat/types';

export interface DisplayPreferenceMemory extends UserMemoryPreferenceWithoutVectors {
  title: string | null;
}

export type DisplayContextMemory = UserMemoryContextWithoutVectors;
