import type { TaskListItem } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { type AgentSchedule, agentScheduleTime, toAgentSchedule } from './agentScheduleModel';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key) as any;

const task = (patch: Partial<TaskListItem>): TaskListItem =>
  ({
    automationMode: 'schedule',
    heartbeatInterval: null,
    id: 'task-1',
    identifier: 'T-1',
    instruction: 'Back up the workspace\nthen report',
    name: null,
    schedulePattern: '0 3 * * *',
    ...patch,
  }) as TaskListItem;

const schedule = (patch: Partial<AgentSchedule>): AgentSchedule => ({
  enabled: true,
  heartbeatInterval: null,
  id: 'task-1',
  mode: 'schedule',
  name: 'Backup',
  schedulePattern: '0 3 * * *',
  ...patch,
});

describe('toAgentSchedule', () => {
  it('names a task by its name, else the first instruction line', () => {
    expect(toAgentSchedule(task({ name: ' Daily backup ' })).name).toBe('Daily backup');
    expect(toAgentSchedule(task({})).name).toBe('Back up the workspace');
  });

  it('shows a row switched off here as off, keeping the mode to restore', () => {
    const off = toAgentSchedule(
      task({ automationMode: null, heartbeatInterval: 600, schedulePattern: '0 3 * * *' }),
      'heartbeat',
    );
    expect([off.enabled, off.mode]).toEqual([false, 'heartbeat']);
  });

  it('infers the mode to restore from the columns when none was recorded', () => {
    const heartbeat = task({ automationMode: null, heartbeatInterval: 600, schedulePattern: null });
    expect(toAgentSchedule(heartbeat).mode).toBe('heartbeat');
    expect(toAgentSchedule(task({ automationMode: null })).mode).toBe('schedule');
  });
});

describe('agentScheduleTime', () => {
  it('describes a cron schedule', () => {
    expect(agentScheduleTime(schedule({}), t)).toBe('taskSchedule.summary.daily:{"time":"03:00"}');
  });

  it('describes a monthly cron as monthly, not daily', () => {
    expect(agentScheduleTime(schedule({ schedulePattern: '0 10 1 * *' }), t)).toBe(
      'taskSchedule.summary.monthly:{"day":1,"time":"10:00"}',
    );
  });

  it('shows a cron it cannot put into words as the pattern itself', () => {
    expect(agentScheduleTime(schedule({ schedulePattern: '0 9 1-7 1,7 *' }), t)).toBe(
      '0 9 1-7 1,7 *',
    );
  });

  it('describes a heartbeat interval', () => {
    expect(agentScheduleTime(schedule({ heartbeatInterval: 3600, mode: 'heartbeat' }), t)).toBe(
      'taskSchedule.summary.heartbeat:{"interval":"taskSchedule.unit.hour:{\\"count\\":1}"}',
    );
  });
});
