/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Render from './index';

const link = vi.hoisted(() => ({ hook: vi.fn() }));
vi.mock('@/features/MessageList/useAgentConversationLink', () => ({
  useAgentConversationLink: link.hook,
}));
vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ children, to, onClick }: { children: ReactNode; onClick?: () => void; to: string }) =>
    createElement('a', { href: to, onClick }, children),
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));

describe('LobeAgents card', () => {
  it('links to the person’s direct Channel with the Agent', () => {
    link.hook.mockReturnValue({ url: '/channel/chn_1' });
    render(<Render description={'Decks'} identifier={'agt_x'} title={'Deck'} {...({} as any)} />);

    expect(link.hook).toHaveBeenCalledWith('agt_x', expect.any(String));
    expect(screen.getByText('Deck').closest('a')?.getAttribute('href')).toBe('/channel/chn_1');
    expect(screen.getByText('Decks')).toBeTruthy();
  });

  it('opens the direct Channel on click when the Agent has none yet', () => {
    const onClick = vi.fn();
    link.hook.mockReturnValue({ onClick, url: '/agent/agt_x' });
    render(<Render identifier={'agt_x'} title={'Deck'} {...({} as any)} />);

    screen.getByText('Deck').closest('a')!.click();
    expect(onClick).toHaveBeenCalled();
  });
});
