import type { TaskAutomationMode, TaskListItem } from '@lobot/types';
import type { TFunction } from 'i18next';

import { formatScheduleDescription } from '@/features/AgentTasks/AgentTaskDetail/scheduler/helpers';

/** One of an Agent's recurring tasks, as its profile lists it. */
export interface AgentSchedule {
  enabled: boolean;
  heartbeatInterval: number | null;
  id: string;
  /** The mode to restore when the switch is turned back on. */
  mode: TaskAutomationMode;
  name: string;
  schedulePattern: string | null;
}

export const toAgentSchedule = (task: TaskListItem): AgentSchedule | undefined => {
  const mode = task.automationMode;
  if (!mode) return;
  return {
    enabled: true,
    heartbeatInterval: task.heartbeatInterval,
    id: task.id,
    mode,
    name: task.name?.trim() || task.instruction.trim().split('\n')[0] || task.identifier,
    schedulePattern: task.schedulePattern,
  };
};

/**
 * The server lists only live automation, so a schedule switched off here drops
 * out on the next fetch. Keep the ones toggled in this panel where they were, so
 * the switch can be turned straight back on.
 */
export const mergeAgentSchedules = (
  fetched: AgentSchedule[],
  toggled: Record<string, AgentSchedule>,
): AgentSchedule[] => {
  const seen = new Set<string>();
  const list = fetched.map((item) => {
    seen.add(item.id);
    return toggled[item.id] ?? item;
  });
  for (const item of Object.values(toggled)) if (!seen.has(item.id)) list.push(item);
  return list;
};

const formatInterval = (seconds: number, t: TFunction<'chat'>) => {
  if (seconds % 3600 === 0) return t('taskSchedule.unit.hour', { count: seconds / 3600 });
  if (seconds % 60 === 0) return t('taskSchedule.unit.minute', { count: seconds / 60 });
  return t('taskSchedule.unit.second', { count: seconds });
};

const pad = (n: number) => String(n).padStart(2, '0');
const isPlainNumber = (field: string) => /^\d+$/.test(field);

/**
 * The shared cron summary only knows hourly, daily and weekly shapes and reads
 * any other pattern as one of them, so "0 10 1 * *" would come out as "Daily".
 * An Agent can set any cron, so describe a plain monthly one here and show the
 * pattern itself for anything else the summary cannot put into words.
 */
const describeCron = (pattern: string, t: TFunction<'chat'>): string => {
  const fields = pattern.trim().split(/\s+/);
  if (fields.length !== 5) return pattern;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  if (dayOfMonth === '*' && month === '*') return formatScheduleDescription(pattern, t);
  if (
    month === '*' &&
    dayOfWeek === '*' &&
    isPlainNumber(minute) &&
    isPlainNumber(hour) &&
    isPlainNumber(dayOfMonth)
  ) {
    return t('taskSchedule.summary.monthly', {
      day: Number(dayOfMonth),
      time: `${pad(Number(hour))}:${pad(Number(minute))}`,
    });
  }
  return pattern;
};

/** "Daily at 09:00", "Runs every 30 mins": when the schedule fires. */
export const agentScheduleTime = (item: AgentSchedule, t: TFunction<'chat'>): string => {
  if (item.mode === 'heartbeat') {
    const seconds = item.heartbeatInterval ?? 0;
    return seconds > 0
      ? t('taskSchedule.summary.heartbeat', { interval: formatInterval(seconds, t) })
      : '';
  }
  return item.schedulePattern ? describeCron(item.schedulePattern, t) : '';
};
