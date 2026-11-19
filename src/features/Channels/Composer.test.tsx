/**
 * @vitest-environment happy-dom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Composer } from './Composer';

const editor = vi.hoisted(() => ({
  cleanDocument: vi.fn(),
  focus: vi.fn(),
  getDocument: vi.fn((type: string) => (type === 'markdown' ? 'hello' : { root: {} })),
  getLexicalEditor: vi.fn(() => null),
  getRootElement: vi.fn(() => null),
}));

vi.mock('@lobehub/editor/react', () => ({
  ChatInput: ({ children, header }: { children: ReactNode; header?: ReactNode }) => (
    <div>
      {header}
      {children}
    </div>
  ),
  // Reports typed content once, which is what reveals the Send button.
  Editor: ({ onChange }: { onChange: () => void }) => {
    useEffect(() => onChange(), [onChange]);
    return <div contentEditable aria-label="input" tabIndex={0} />;
  },
  // The real button forwards the remaining props to its <button>.
  SendButton: ({
    onMouseDown,
    onSend,
    'aria-label': label,
    disabled,
  }: {
    'aria-label': string;
    'disabled'?: boolean;
    'onMouseDown'?: (event: unknown) => void;
    'onSend': () => void;
  }) => (
    <button aria-label={label} disabled={disabled} onClick={onSend} onMouseDown={onMouseDown} />
  ),
  useEditor: () => editor,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => undefined,
}));
vi.mock('@/components/DragUploadZone/useLocalDragUpload', () => ({
  useLocalDragUpload: () => ({ getContainerProps: () => ({}) }),
}));
vi.mock('@/components/DragUploadZone/usePasteFile', () => ({ usePasteFile: () => undefined }));
vi.mock('@/features/WideScreenContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/useEnterToSend', () => ({ useEnterToSend: () => () => true }));
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ allowed: true }) }));
vi.mock(import('@/libs/replica'), async (importOriginal) => ({
  ...(await importOriginal()),
  cacheScope: { get: () => 'scope' } as never,
}));
vi.mock('@/store/home', () => ({ useHomeStore: { getState: () => ({}) } }));
vi.mock('@/store/home/selectors', () => ({ homeAgentListSelectors: { allAgents: () => [] } }));
vi.mock('@/store/serverConfig', () => ({
  featureFlagsSelectors: () => ({ enableKnowledgeBase: false }),
  useServerConfigStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'user_me' } }));
vi.mock('./ComposerActions', () => ({ ComposerActions: () => null }));
vi.mock('./useAttachments', () => ({
  useAttachments: () => ({
    blocked: false,
    clear: vi.fn(),
    items: [],
    readyFileIds: () => [],
  }),
}));
vi.mock('./useComposerDraft', () => ({
  useComposerDraft: () => ({ clear: vi.fn(), flush: vi.fn(), save: vi.fn(), snapshot: vi.fn() }),
}));
vi.mock('./useMentionInvites', () => ({
  useMentionInvites: () => ({
    agentDrafts: null,
    clearError: vi.fn(),
    enabled: false,
    error: '',
    resolve: async () => [],
  }),
}));

const renderComposer = (delivery: Parameters<typeof Composer>[0]['onSend'] | 'queue') =>
  render(
    <Composer
      draftKey="channel:c1:main"
      members={[]}
      placeholder="Message"
      {...(delivery === 'queue' ? { onQueue: vi.fn() } : { onSend: delivery })}
    />,
  );

/** Clicks Send on a composer whose server send stays pending until `finish` is called. */
const startPendingSend = async () => {
  let finish!: () => void;
  const onSend = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  renderComposer(onSend);
  fireEvent.click(await screen.findByRole('button', { name: 'send' }));
  await vi.waitFor(() => expect(onSend).toHaveBeenCalled());
  return () => act(async () => finish());
};

describe('Composer focus', () => {
  beforeEach(() => {
    editor.focus.mockClear();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it('keeps focus in the input when Send is pressed', async () => {
    renderComposer('queue');
    const send = await screen.findByRole('button', { name: 'send' });

    // A press that is not canceled moves focus onto the button, which unmounts once the
    // input clears and leaves focus on <body>.
    expect(fireEvent.mouseDown(send)).toBe(false);
  });

  it('hands focus back to the input once a send that locked it settles', async () => {
    const finish = await startPendingSend();
    expect(editor.focus).not.toHaveBeenCalled();

    await finish();

    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it('reclaims focus the cleared document drops a frame after a queued send', async () => {
    renderComposer('queue');
    const input = screen.getByLabelText('input');
    input.focus();
    fireEvent.click(await screen.findByRole('button', { name: 'send' }));
    editor.focus.mockClear();

    // Clearing the document swaps the editor's DOM after the settle commit, so the blur
    // lands once the effect has already run.
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => new Promise((resolve) => requestAnimationFrame(resolve)));

    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it('leaves focus on a control the user moved to while the send was busy', async () => {
    const finish = await startPendingSend();
    const other = document.createElement('input');
    document.body.append(other);
    other.focus();

    await finish();

    expect(document.activeElement).toBe(other);
    expect(editor.focus).not.toHaveBeenCalled();
    other.remove();
  });
});
