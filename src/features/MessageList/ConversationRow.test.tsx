/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConversationRow from './ConversationRow';

const navigate = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values?.count !== undefined
        ? `${key}(${values.count})`
        : values
          ? `${key}(${values.title}|${values.content})`
          : key,
  }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ to, ...rest }: { to: string }) => createElement('a', { href: to, ...rest }),
}));

const renderRow = (active: boolean, onClick = vi.fn(), closeOnReselect = true) => {
  render(
    createElement(ConversationRow, {
      active,
      avatar: null,
      closeOnReselect,
      onClick,
      title: 'Dario',
      url: '/channels/chn_dario',
    }),
  );
  return { onClick, row: screen.getByRole('link', { name: 'Dario' }) };
};

describe('ConversationRow', () => {
  beforeEach(() => navigate.mockClear());

  it('closes the open conversation when it is clicked again', () => {
    const { onClick, row } = renderRow(true);

    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
    fireEvent(row, event);

    expect(event.defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('opens an inactive conversation through its own click handling', () => {
    const { onClick, row } = renderRow(false);

    fireEvent.click(row);

    expect(navigate).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // Directory rows (the contacts tab) open a profile, so a second click must not leave it.
  it('keeps the open row selected when it does not close on reselect', () => {
    const { onClick, row } = renderRow(true, vi.fn(), false);

    fireEvent.click(row);

    expect(navigate).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves a modified click on the open conversation to the link', () => {
    const { row } = renderRow(true);

    fireEvent.click(row, { metaKey: true });

    expect(navigate).not.toHaveBeenCalled();
  });

  // A row with no chat yet kept a blank preview line, so its title sat high instead of centered.
  it('leaves out the preview line when there is no preview', () => {
    const { row } = renderRow(false);

    expect(row.textContent).toBe('Dario');
  });

  // A Thread reply read like the main conversation's last word; the preview names its Thread.
  it('names the Thread before a Thread reply preview', () => {
    const { rerender } = render(
      createElement(ConversationRow, {
        avatar: null,
        preview: 'Conflict resolved',
        previewThread: { id: 'thr_1', title: 'Member model' },
        title: 'Dario',
        url: '/channels/chn_dario',
      }),
    );
    expect(screen.getByText('threadPreview(Member model|Conflict resolved)')).toBeInTheDocument();

    rerender(
      createElement(ConversationRow, {
        avatar: null,
        preview: 'Conflict resolved',
        previewThread: { id: 'thr_1', title: null },
        title: 'Dario',
        url: '/channels/chn_dario',
      }),
    );
    expect(screen.getByText('threadPreview(thread|Conflict resolved)')).toBeInTheDocument();
  });

  // The row said a green "running" with a spinner; it now reads like the header's typing line.
  it('says typing in place of the preview while the Agent prepares a reply', () => {
    render(
      createElement(ConversationRow, {
        activity: 'typing',
        avatar: null,
        preview: 'last message',
        title: 'Dario',
        url: '/channels/chn_dario',
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('activity.typing');
    expect(screen.queryByText('last message')).toBeNull();
  });

  // The row kept saying "typing" while the composer said the Agent was working.
  it('says working, like the composer, once the reply runs', () => {
    render(
      createElement(ConversationRow, {
        activity: 'working',
        avatar: null,
        preview: 'last message',
        title: 'Dario',
        url: '/channels/chn_dario',
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('status.working');
  });

  it('says how many things the Agent works on at once', () => {
    render(
      createElement(ConversationRow, {
        activity: 'working',
        activityCount: 2,
        avatar: null,
        preview: 'last message',
        title: 'Cook',
        url: '/channels/chn_cook',
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('activity.parallel(2)');
    expect(screen.queryByText('last message')).toBeNull();
  });
});
