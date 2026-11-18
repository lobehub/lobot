import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TabItem from './TabItem';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@lobehub/ui', () => ({
  Icon: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ to, ...rest }: { to: string } & Record<string, unknown>) => <a href={to} {...rest} />,
}));

describe('TabItem', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens its page when clicked from another tab', () => {
    const onReselect = vi.fn();
    render(<TabItem title={'Messages'} url={'/'} onReselect={onReselect} />);

    fireEvent.click(screen.getByRole('link', { name: 'Messages' }));

    expect(navigate).toHaveBeenCalledWith('/');
    expect(onReselect).not.toHaveBeenCalled();
  });

  // Clicking the open Messages tab's badge used to navigate to the page already shown.
  it('runs its reselect action instead when clicked while already open', () => {
    const onReselect = vi.fn();
    render(<TabItem active badge={1} title={'Messages'} url={'/'} onReselect={onReselect} />);

    fireEvent.click(screen.getByRole('link', { name: 'Messages' }));

    expect(onReselect).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
