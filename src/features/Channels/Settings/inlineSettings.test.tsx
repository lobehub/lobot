/** @vitest-environment happy-dom */
import type { ChannelListItem } from '@lobot/types';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneralSection } from './GeneralSection';
import { ReplySection } from './ReplySection';

const state = vi.hoisted(() => ({
  config: { channel: { enabled: true, pace: 'custom', rules: { scope: 'none' } } },
  rename: vi.fn(),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
  Input: ({
    onPressEnter,
    ...props
  }: ComponentProps<'input'> & {
    onPressEnter?: ComponentProps<'input'>['onKeyDown'];
  }) => (
    <input
      {...props}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.(event);
      }}
    />
  ),
  Switch: ({
    checked,
    onChange,
    ...props
  }: Omit<ComponentProps<'button'>, 'onChange'> & {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button {...props} aria-checked={checked} role="switch" onClick={() => onChange(!checked)} />
  ),
  Select: ({
    options,
    value,
    onChange,
    disabled,
    ...props
  }: {
    'aria-label': string;
    'disabled'?: boolean;
    'options': { label: string; value: string }[];
    'value': string;
    'onChange': (value: string) => void;
  }) => (
    <select
      aria-label={props['aria-label']}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  toast: { success: state.success, error: state.error },
}));
vi.mock('@/components/AsyncBoundary', () => ({
  default: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/utils/trpcError', () => ({ isTrpcErrorCode: () => false }));
vi.mock('@/store/channel', () => ({
  channelActions: {
    rename: state.rename,
    updateWakeConfig: state.update,
    useFetchWakeConfig: () => ({}),
  },
  channelSelectors: { wakeConfig: () => () => state.config },
  useChannelStore: (selector: (store: unknown) => unknown) => selector({}),
}));

const channel = { id: 'chn_1', status: 'active', title: 'Original' } as ChannelListItem;
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.rename.mockResolvedValue(undefined);
  state.update.mockResolvedValue(undefined);
});

describe('inline channel settings', () => {
  it('does not request or toast when the name is unchanged', () => {
    render(<GeneralSection channel={channel} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(state.rename).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });

  it('deduplicates Enter followed immediately by blur while a rename is pending', async () => {
    const request = deferred();
    state.rename.mockReturnValue(request.promise);
    render(<GeneralSection channel={channel} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.blur(input);
    expect(state.rename).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve());
    fireEvent.blur(input);
    expect(state.rename).toHaveBeenCalledTimes(1);
  });

  it('does not submit an Enter used for IME composition', () => {
    render(<GeneralSection channel={channel} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '新名称' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(state.rename).not.toHaveBeenCalled();
  });

  it('writes a concrete wake config and prevents overlapping changes', async () => {
    const request = deferred();
    state.update.mockReturnValue(request.promise);
    render(<ReplySection channelId="chn_1" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'active' } });
    expect(state.update).toHaveBeenCalledWith(
      'chn_1',
      expect.objectContaining({
        enabled: true,
        pace: 'active',
        rules: { scope: 'none' },
      }),
    );
    const toggle = screen.getByRole('switch');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(toggle);
    expect(state.update).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve());
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle);
    expect(state.update).toHaveBeenLastCalledWith(
      'chn_1',
      expect.objectContaining({
        enabled: false,
        pace: 'active',
      }),
    );
  });

  it('rolls a rejected pace change back and keeps custom available', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.update.mockRejectedValueOnce(new Error('refused'));
    render(<ReplySection channelId="chn_1" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'calm' } });
    await waitFor(() => expect(state.error).toHaveBeenCalledWith('settings.reply.saveFailed'));
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('custom');
    expect(screen.getByRole('option', { name: 'settings.reply.pace.custom' })).toBeTruthy();
    vi.restoreAllMocks();
  });
});
