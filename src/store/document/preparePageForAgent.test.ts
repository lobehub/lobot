import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { preparePageForAgent } from './preparePageForAgent';
import { useDocumentStore } from './store';

vi.mock('@/services/document', () => ({
  documentService: {
    updateDocument: vi.fn().mockResolvedValue({
      historyAppended: false,
      id: 'doc-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  },
}));

const seed = (value: Record<string, unknown>) => {
  act(() => {
    useDocumentStore.getState().initDocumentWithEditor({
      content: '# Page',
      documentId: 'doc-1',
      editor: undefined as any,
      sourceType: 'page',
    });
    useDocumentStore
      .getState()
      .internal_dispatchDocument({ id: 'doc-1', type: 'updateDocument', value });
  });
};

describe('preparePageForAgent', () => {
  beforeEach(() => {
    vi.useRealTimers();
    act(() => {
      Object.keys(useDocumentStore.getState().documents).forEach((id) =>
        useDocumentStore.getState().closeDocument(id),
      );
    });
  });

  it('saves a stored page with unsaved typing before the agent reads it', async () => {
    seed({ isDirty: true });
    const performSave = vi
      .spyOn(useDocumentStore.getState(), 'performSave')
      .mockResolvedValue(undefined);

    await expect(preparePageForAgent('doc-1')).resolves.toBe('ready');

    expect(performSave).toHaveBeenCalledWith('doc-1');
  });

  it('does not save a clean stored page', async () => {
    seed({ isDirty: false });
    const performSave = vi.spyOn(useDocumentStore.getState(), 'performSave');

    await preparePageForAgent('doc-1');

    expect(performSave).not.toHaveBeenCalled();
  });
});
