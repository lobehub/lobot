import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateAgentIdentityContent from './CreateContent';

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  connectMounts: 0,
  pick: undefined as ((runtime: unknown) => Promise<unknown>) | undefined,
  pickedAvatar: undefined as ((avatar: string | undefined) => void) | undefined,
  back: undefined as (() => void) | undefined,
  submit: vi.fn(async (_runtime?: unknown) => true),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type={'button'} onClick={onClick}>
      {children}
    </button>
  ),
  Center: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Flexbox: ({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) => (
    <div hidden={hidden}>{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  toast: { error: vi.fn() },
  useModalContext: () => ({ close: mocks.close }),
}));
vi.mock('@/components/AgentAvatar', () => ({
  default: ({ avatar }: { avatar: string }) => (
    <i data-avatar={avatar} data-testid={'agent-avatar'} />
  ),
}));
vi.mock('@/components/EmojiPicker', () => ({ default: () => null }));
vi.mock('@/store/global', () => ({ useGlobalStore: () => 'en-US' }));
vi.mock('@/store/global/selectors', () => ({
  globalGeneralSelectors: { currentLanguage: vi.fn() },
}));
vi.mock('./BlindBoxAvatar', () => ({ default: () => <i data-testid={'blind-box'} /> }));
vi.mock('@/features/ConnectAgent/providers', () => ({
  CONNECTABLE_PROVIDERS: ['claude-code', 'codex', 'openclaw', 'cursor', 'kimi-code', 'amp'].map(
    (type) => ({
      brand: { Avatar: () => <i data-testid={`runtime-${type}`} /> },
      title: type,
      type,
    }),
  ),
}));
vi.mock('./IdentityFields', () => ({
  default: ({ advancedExtra }: { advancedExtra?: ReactNode }) => (
    <>
      <input aria-label={'identity'} />
      {advancedExtra}
    </>
  ),
}));
vi.mock('./useCreateAgentIdentityForm', () => ({
  useCreateAgentIdentityForm: () => ({
    name: '小朵',
    saving: false,
    submit: mocks.submit,
    title: '',
    uploading: false,
  }),
}));
vi.mock('@/features/ConnectAgent', async () => {
  const { useEffect } = await import('react');
  return {
    ConnectAgentContent: ({
      onBack,
      onPick,
      onPickedAvatarChange,
    }: {
      onBack: () => void;
      onPick: (runtime: unknown) => Promise<unknown>;
      onPickedAvatarChange: (avatar: string | undefined) => void;
    }) => {
      useEffect(() => {
        mocks.connectMounts += 1;
      }, []);
      mocks.back = onBack;
      mocks.pick = onPick;
      mocks.pickedAvatar = onPickedAvatarChange;
      return <div>runtime-picker</div>;
    },
  };
});

const openRuntime = () =>
  fireEvent.click(screen.getByRole('button', { name: /settingAgent.identity.externalRuntime/ }));

describe('CreateAgentIdentityContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectMounts = 0;
    mocks.submit.mockResolvedValue(true);
  });

  it('shows the best-known third-party agents on the option by icon', () => {
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);

    expect(screen.getAllByTestId(/^runtime-/).map((el) => el.dataset.testid)).toEqual([
      'runtime-claude-code',
      'runtime-codex',
      'runtime-openclaw',
      'runtime-cursor',
      'runtime-kimi-code',
    ]);
  });

  it('creates a plain agent straight from the identity form', () => {
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'settingAgent.identity.create' }));

    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith();
    expect(screen.queryByText('runtime-picker')).not.toBeInTheDocument();
  });

  it('goes straight to picking the driving agent from the third-party entry', async () => {
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);

    // No checkbox and no separate "next" button: the entry itself opens the step.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    openRuntime();

    expect(screen.getByText('runtime-picker')).toBeVisible();
    expect(screen.getByLabelText('identity')).not.toBeVisible();

    const runtime = { provider: 'claude-code' };
    await act(async () => {
      await mocks.pick?.(runtime);
    });
    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith(runtime);
  });

  it("previews the picked runtime's mark as the avatar the new agent will wear", () => {
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);
    openRuntime();

    // Nothing picked yet: the generated character.
    expect(screen.getAllByTestId('blind-box').length).toBeGreaterThan(0);
    act(() => mocks.pickedAvatar?.('codex-logo'));
    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-avatar', 'codex-logo');
  });

  it('returns to the identity step when creating fails, e.g. on a taken slug', async () => {
    mocks.submit.mockResolvedValue(false);
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);
    openRuntime();

    await act(async () => {
      await mocks.pick?.({});
    });

    expect(screen.getByLabelText('identity')).toBeVisible();
    expect(screen.getByText('runtime-picker')).not.toBeVisible();
  });

  it('keeps the picker mounted when going back and forth, so the scan is not redone', () => {
    render(<CreateAgentIdentityContent onCreated={vi.fn()} />);
    openRuntime();

    act(() => mocks.back?.());
    expect(screen.getByLabelText('identity')).toBeVisible();
    openRuntime();

    expect(mocks.connectMounts).toBe(1);
  });
});
