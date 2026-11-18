import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { taskService } from '@/services/task';

import { AgentSchedules } from './AgentSchedules';

vi.mock('@/services/task', () => ({
  taskService: { list: vi.fn(), update: vi.fn() },
}));

const task = (id: string, patch: Record<string, unknown> = {}) => ({
  automationMode: 'schedule',
  heartbeatInterval: null,
  id,
  identifier: id.toUpperCase(),
  instruction: `run ${id}`,
  name: `Task ${id}`,
  schedulePattern: '0 3 * * *',
  ...patch,
});

const renderList = () =>
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AgentSchedules agentId="agt_1" />
    </SWRConfig>,
  );

describe('AgentSchedules', () => {
  beforeEach(() => {
    vi.mocked(taskService.list).mockReset();
    vi.mocked(taskService.update).mockReset();
  });

  it("lists the Agent's live schedules and folds past five", async () => {
    vi.mocked(taskService.list).mockResolvedValue({
      data: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => task(id)) as any,
      success: true,
      total: 6,
    });
    renderList();

    expect(await screen.findByText('Task a')).toBeInTheDocument();
    expect(taskService.list).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeAgentId: 'agt_1', automated: true }),
    );
    expect(screen.queryByText('Task f')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'profile.schedules.expand' }));
    expect(screen.getByText('Task f')).toBeInTheDocument();
  });

  it('turns a schedule off and back on in its own mode', async () => {
    vi.mocked(taskService.list).mockResolvedValue({
      data: [task('a', { automationMode: 'heartbeat', heartbeatInterval: 3600 })] as any,
      success: true,
      total: 1,
    });
    vi.mocked(taskService.update).mockResolvedValue({} as any);
    renderList();

    const toggle = await screen.findByRole('switch', { name: 'Task a' });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(taskService.update).toHaveBeenCalledWith('a', { automationMode: null }),
    );
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(toggle);
    await waitFor(() =>
      expect(taskService.update).toHaveBeenLastCalledWith('a', { automationMode: 'heartbeat' }),
    );
  });

  it('renders nothing for an Agent without schedules', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ data: [], success: true, total: 0 });
    const { container } = renderList();
    await waitFor(() => expect(taskService.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
