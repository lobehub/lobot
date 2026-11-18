import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore, Provider } from '@/features/Conversation/store';
import { usePermission } from '@/hooks/usePermission';
import { agentByIdSelectors } from '@/store/agent/selectors';

import { useDoubleClickEdit } from './useDoubleClickEdit';

vi.mock('@/hooks/usePermission', () => ({ usePermission: vi.fn(() => ({ allowed: true })) }));

/** @example Codex cannot rewind its native thread, so Alt-double-click never edits its user turns. */
describe('Codex user edit shortcut', () => {
  beforeEach(() => vi.mocked(usePermission).mockReturnValue({ allowed: true }));
  afterEach(() => vi.restoreAllMocks());

  const setup = (provider: 'codex' | 'claude-code', role = 'user') => {
    vi.spyOn(agentByIdSelectors, 'getAgencyConfigById').mockImplementation(
      (id) => () => (id === 'owner' ? { heterogeneousProvider: { type: provider } } : undefined),
    );
    const store = createStore({
      context: { agentId: 'owner', topicId: 'source', threadId: null },
    });
    const toggle = vi.spyOn(store.getState(), 'toggleMessageEditing');
    const Bubble = () =>
      createElement('div', {
        'data-testid': 'message',
        'onDoubleClick': useDoubleClickEdit({ id: 'message', role, error: undefined }),
      });
    const view = render(
      createElement(Provider, { children: createElement(Bubble), createStore: () => store }),
    );
    return { bubble: view.getByTestId('message'), toggle };
  };

  it('keeps the editor closed for a Codex user message', () => {
    const { bubble, toggle } = setup('codex');
    fireEvent.doubleClick(bubble, { altKey: true });
    expect(toggle).not.toHaveBeenCalled();
  });

  it('still edits a Codex assistant message', () => {
    const { bubble, toggle } = setup('codex', 'assistant');
    fireEvent.doubleClick(bubble, { altKey: true });
    expect(toggle).toHaveBeenCalledWith('message', true);
  });

  it('keeps non-Codex editing available', () => {
    const { bubble, toggle } = setup('claude-code');
    fireEvent.doubleClick(bubble, { altKey: true });
    expect(toggle).toHaveBeenCalledWith('message', true);
  });
});
