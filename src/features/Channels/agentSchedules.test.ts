import type { TaskListItem } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import {
  type AgentSchedule,
  agentScheduleTime,
  mergeAgentSchedules,
  toAgentSchedule,
} from './agentSchedules';

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
    expect(toAgentSchedule(task({ name: ' Daily backup ' }))?.name).toBe('Daily backup');
    expect(toAgentSchedule(task({}))?.name).toBe('Back up the workspace');
  });

  it('skips a task without automation', () => {
    expect(toAgentSchedule(task({ automationMode: null }))).toBeUndefined();
  });
});

describe('mergeAgentSchedules', () => {
  it('keeps a schedule switched off here after the server stops listing it', () => {
    const off = schedule({ enabled: false, id: 'task-2' });
    const list = mergeAgentSchedules([schedule({})], { 'task-2': off });
    expect(list.map((item) => [item.id, item.enabled])).toEqual([
      ['task-1', true],
      ['task-2', false],
    ]);
  });

  it('shows the local switch state over the fetched row', () => {
    const list = mergeAgentSchedules([schedule({})], {
      'task-1': schedule({ enabled: false }),
    });
    expect(list).toEqual([schedule({ enabled: false })]);
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
