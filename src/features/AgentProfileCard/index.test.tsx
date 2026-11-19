/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AgentProfileCard from '.';

vi.mock('@/components/AgentAvatar', () => ({
  default: ({ onClick, shape }: { onClick?: () => void; shape?: string }) => (
    <span data-shape={shape} onClick={onClick} />
  ),
  isDefaultAgentAvatar: () => false,
}));

describe('AgentProfileCard', () => {
  // Only the 48px avatar and the name opened the Agent's page; the banner above them did not.
  it('opens the Agent from the banner too', () => {
    const onHeaderClick = vi.fn();
    const { container } = render(
      <AgentProfileCard title={'Justin'} onHeaderClick={onHeaderClick} />,
    );

    fireEvent.click(container.firstElementChild!.firstElementChild!);

    expect(onHeaderClick).toHaveBeenCalledTimes(1);
  });

  it('leaves the banner inert when the Agent has no page to open', () => {
    const { container } = render(<AgentProfileCard title={'Justin'} />);

    expect(() => fireEvent.click(container.firstElementChild!.firstElementChild!)).not.toThrow();
  });

  it('uses the agent cover as the banner and a round avatar', () => {
    const { container } = render(
      <AgentProfileCard
        agentId={'agt_dario'}
        avatar={'https://cdn.example.com/face.png'}
        backgroundColor={'https://cdn.example.com/banner.png'}
        title={'Dario'}
      />,
    );

    const cover = container.querySelector('[data-cover-image]');
    expect(cover).toBeTruthy();
    expect(cover?.getAttribute('style')).toContain('banner.png');
    expect(container.querySelector('[data-pattern]')).toBeNull();
    expect(container.querySelectorAll('[data-shape="circle"]')).toHaveLength(1);
  });

  it('gives an agent without an uploaded cover its own patterned banner', () => {
    const { container } = render(<AgentProfileCard agentId={'agt_dario'} title={'Dario'} />);

    expect(container.querySelector('[data-pattern]')).toBeTruthy();
    expect(container.querySelector('[data-cover-image]')).toBeNull();
    expect(container.querySelectorAll('[data-shape="circle"]')).toHaveLength(1);
  });
});
