import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStore, Provider } from '@/features/Conversation/store';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';

import { useEditConfirmation } from './useEditConfirmation';

/** @example Codex user prompts are not editable; other messages save, and the last one resends. */
describe('message edit confirmation', () => {
  afterEach(() => vi.restoreAllMocks());

  const setup = (
    provider: 'codex' | 'claude-code' = 'codex',
    globalProvider = provider,
    id = 'u1',
  ) => {
    // The globally active agent is a different one, running `globalProvider`.
    useAgentStore.setState({ activeAgentId: 'global-agent' });
    vi.spyOn(agentByIdSelectors, 'getAgencyConfigById').mockImplementation(
      (id) => () =>
        id === 'agent'
          ? { heterogeneousProvider: { type: provider } }
          : id === 'global-agent'
            ? { heterogeneousProvider: { type: globalProvider } }
            : undefined,
    );
    const store = createStore({
      context: { agentId: 'agent', topicId: 'topic', threadId: null },
      messages: ['u1', 'u2'].map((id, index) => ({
        id,
        content: id,
        role: 'user',
        createdAt: index,
        updatedAt: index,
      })),
    });
    const save = vi.spyOn(store.getState(), 'updateMessageContent').mockResolvedValue();
    const resend = vi.spyOn(store.getState(), 'regenerateUserMessage').mockResolvedValue();
    const close = vi.fn();
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(Provider, { children, createStore: () => store });
    const hook = renderHook(
      () =>
        useEditConfirmation({
          id,
          editing: true,
          canEdit: true,
          canCreate: true,
          onEditingChange: close,
        }),
      { wrapper },
    );
    return { ...hook, close, resend, save };
  };

  it('rejects a Codex user edit and keeps the editor open', async () => {
    const { result, resend, save, close } = setup();
    expect(result.current.shouldSendOnConfirm).toBe(false);
    await expect(result.current.onConfirm('edited')).rejects.toThrow(
      'messageAction.codexEdit.cannotSubmit',
    );
    expect(save).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  /** @example An isolated editor follows its own agent when global selection differs. */
  it('classifies by the conversation agent, not the global one', async () => {
    const { result, save } = setup('claude-code', 'codex');
    await act(() => result.current.onConfirm('ordinary edit'));
    expect(save).toHaveBeenCalledWith('u1', 'ordinary edit', { editorData: undefined });
  });

  it('saves an older ordinary message without resending', async () => {
    const { result, resend, save } = setup('claude-code');
    expect(result.current.shouldSendOnConfirm).toBe(false);
    await act(() => result.current.onConfirm('edited'));
    expect(save).toHaveBeenCalledWith('u1', 'edited', { editorData: undefined });
    expect(resend).not.toHaveBeenCalled();
  });

  it('saves and resends the last ordinary user message', async () => {
    const { result, resend, save } = setup('claude-code', 'claude-code', 'u2');
    expect(result.current.shouldSendOnConfirm).toBe(true);
    await act(() => result.current.onConfirm('edited'));
    expect(save).toHaveBeenCalledWith('u2', 'edited', { editorData: undefined });
    expect(resend).toHaveBeenCalledWith('u2');
  });
});
