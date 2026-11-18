import { describe, expect, it, vi } from 'vitest';

import { AppIndexedDBStorage } from '@/libs/replica';

import { contactProfileResource } from './projection';

vi.mock('@/services/contact', () => ({ contactService: {} }));

describe('contactProfileResource', () => {
  // Memory-only, a restart dropped every profile and each card opened on a skeleton.
  it('persists profiles so a card opens from the last copy after a restart', () => {
    expect(contactProfileResource.storage).toBeInstanceOf(AppIndexedDBStorage);
  });
});
