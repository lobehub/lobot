import type {
  UserMemoryContextWithoutVectors,
  UserMemoryPreferenceWithoutVectors,
} from '@lobot/types';

export interface DisplayPreferenceMemory extends UserMemoryPreferenceWithoutVectors {
  title: string | null;
}

export type DisplayContextMemory = UserMemoryContextWithoutVectors;
