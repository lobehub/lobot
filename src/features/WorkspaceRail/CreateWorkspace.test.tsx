import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  create: vi.fn(),
  modalContent: null as ReactNode,
  refresh: vi.fn(async () => {}),
  switchWorkspace: vi.fn(async () => {}),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));
vi.mock('i18next', () => ({ t: (key: string) => key }));
vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createModal: ({ content }: { content: ReactNode }) => {
    mocks.modalContent = content;
  },
  useModalContext: () => ({ close: mocks.close, setCanDismissByClickOutside: vi.fn() }),
}));
vi.mock('@/business/client/workspace/service', () => ({
  workspaceService: { create: mocks.create },
}));
vi.mock('@/business/client/workspace/list', () => ({ refreshWorkspaces: mocks.refresh }));
vi.mock('@/business/client/hooks/useSwitchWorkspace', () => ({
  useSwitchWorkspace: () => ({ switchWorkspace: mocks.switchWorkspace }),
}));
vi.mock('@/components/AsyncError', () => ({
  default: ({ error }: { error: Error }) => createElement('div', {}, `Failed: ${error.message}`),
}));

const { openCreateWorkspace, workspaceLimitError } = await import('./CreateWorkspace');

const openAndType = (name: string) => {
  const onCreated = vi.fn();
  openCreateWorkspace(onCreated);
  render(createElement('div', {}, mocks.modalContent));
  fireEvent.change(screen.getByRole('textbox', { name: 'workspaceRail.createModal.name' }), {
    target: { value: name },
  });
  return onCreated;
};

describe('CreateWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the workspace from its name, refreshes the list and hands back its id', async () => {
    mocks.create.mockResolvedValue({ id: 'ws-new', name: 'Acme', slug: 'acme-abc123' });
    const onCreated = openAndType('  Acme  ');

    fireEvent.click(screen.getByRole('button', { name: 'workspaceRail.createModal.submit' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('ws-new'));
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'Acme',
      slug: expect.stringMatching(/^acme-[a-z0-9]{6}$/),
    });
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });

  it('cannot submit an empty name', () => {
    openAndType('   ');
    expect(screen.getByRole('button', { name: 'workspaceRail.createModal.submit' })).toBeDisabled();
  });

  it('explains the free workspace cap instead of a raw error and keeps the dialog open', async () => {
    mocks.create.mockRejectedValue(new Error('FREE_WORKSPACE_LIMIT_REACHED:3'));
    const onCreated = openAndType('Acme');

    fireEvent.click(screen.getByRole('button', { name: 'workspaceRail.createModal.submit' }));

    expect(await screen.findByText('workspaceRail.createModal.freeLimit:3')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it('reads both server caps out of the error message', () => {
    expect(workspaceLimitError(new Error('WORKSPACE_TOTAL_LIMIT_REACHED:20'))).toEqual({
      code: 'total',
      limit: 20,
    });
    expect(workspaceLimitError(new Error('network down'))).toBeUndefined();
  });
});
