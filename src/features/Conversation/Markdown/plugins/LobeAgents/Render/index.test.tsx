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
const avatar = vi.hoisted(() => ({ props: undefined as any }));
vi.mock('@/components/AgentAvatar', () => ({
  default: (props: any) => {
    avatar.props = props;
    return null;
  },
}));
const meta = vi.hoisted(() => ({ hook: vi.fn() }));
vi.mock('@/features/AgentTasks/shared/useAgentDisplayMeta', () => ({
  useAgentDisplayMeta: meta.hook,
}));

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

  it('prefers the agent’s live meta over the snapshot the model wrote', () => {
    link.hook.mockReturnValue({ url: '/channel/chn_1' });
    meta.hook.mockReturnValue({ avatar: '🎤', backgroundColor: '#fff', title: '石未深' });
    render(<Render identifier={'agt_x'} title={'PPT 对外演讲'} {...({} as any)} />);

    expect(screen.getByText('石未深')).toBeTruthy();
    expect(screen.queryByText('PPT 对外演讲')).toBeNull();
    expect(avatar.props).toMatchObject({ avatar: '🎤', background: '#fff' });
    meta.hook.mockReset();
  });

  it('falls back to the tag for an agent the client has not loaded', () => {
    link.hook.mockReturnValue({ url: '/agent/agt_y' });
    meta.hook.mockReturnValue(undefined);
    render(<Render avatar={'💻'} identifier={'agt_y'} title={'Coder'} {...({} as any)} />);

    expect(screen.getByText('Coder')).toBeTruthy();
    expect(avatar.props).toMatchObject({ avatar: '💻' });
  });
});
