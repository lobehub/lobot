/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AgentProfileCard from '.';

vi.mock('@/components/AgentAvatar', () => ({
  default: ({ onClick }: { onClick?: () => void }) => <span onClick={onClick} />,
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
});
