import { Button, Flexbox, Icon, Switch, Text, toast } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { TaskAutomationMode } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ClockIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTaskStore } from '@/store/task';
import { taskListSelectors } from '@/store/task/selectors';
import type { TaskListQuery } from '@/store/task/slices/list/projection';

import { agentProfileStyles } from './agentProfileStyles';
import { type AgentSchedule, agentScheduleTime, toAgentSchedule } from './agentScheduleModel';

/** Rows shown before "Show all". */
export const AGENT_SCHEDULES_COLLAPSED = 5;
const FETCH_LIMIT = 50;
/**
 * A schedule switched off here leaves the live-automation list on the next
 * fetch, so a focus refetch would pull the row out from under its switch.
 * The list refreshes when the panel opens again.
 */
const SYNC_OPTIONS = { revalidateOnFocus: false };

const schedulesQuery = (agentId: string): TaskListQuery => ({
  agentId,
  automated: true,
  limit: FETCH_LIMIT,
  orderBy: 'createdAt',
  visibility: 'all',
});

const styles = stylex.create({
  // On a contact card the list is one more box under the info list, with its title inside.
  contactCard: {
    overflow: 'hidden',
    backgroundColor: cssVar.colorFillQuaternary,
    marginBlockStart: '8px',
    borderRadius: '12px',
    width: '100%',
    textAlign: 'start',
  },
  contactLabel: {
    paddingBlockStart: '12px',
    paddingBlockEnd: '4px',
    paddingInline: '16px',
  },
  contactMore: {
    height: '36px',
  },
  contactRow: {
    paddingInline: '16px',
  },
  label: {
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
  },
  more: {
    borderRadius: 0,
    color: cssVar.colorTextSecondary,
  },
  row: {
    overflow: 'visible',
    minWidth: 0,
    paddingBlock: '8px',
  },
  panelRow: {
    paddingBlock: 10,
    paddingInline: 12,
  },
  panelTime: {
    fontSize: 13,
  },
  time: {
    overflow: 'hidden',
    fontSize: '12px',
    lineHeight: '18px',
    color: cssVar.colorTextTertiary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type AgentSchedulesVariant = 'contact' | 'panel';

const ScheduleRow = ({
  item,
  onToggle,
  variant,
}: {
  item: AgentSchedule;
  onToggle: (item: AgentSchedule, enabled: boolean) => void;
  variant: AgentSchedulesVariant;
}) => {
  const { t } = useTranslation('chat');
  const time = agentScheduleTime(item, t);

  return (
    <Flexbox
      horizontal
      align="center"
      gap={10}
      {...stylex.props(styles.row, variant === 'contact' ? styles.contactRow : styles.panelRow)}
    >
      <Icon
        color={cssVar.colorTextTertiary}
        icon={ClockIcon}
        size={16}
        style={variant === 'panel' ? { flexShrink: 0 } : undefined}
      />
      <Flexbox flex={1} style={{ minWidth: 0 }}>
        <Text
          ellipsis
          fontSize={variant === 'panel' ? 14 : 13}
          title={item.name}
          weight={variant === 'panel' ? 400 : 500}
        >
          {item.name}
        </Text>
        {time && (
          <span
            {...stylex.props(styles.time, variant === 'panel' && styles.panelTime)}
            title={time}
          >
            {time}
          </span>
        )}
      </Flexbox>
      <Switch
        aria-label={item.name}
        checked={item.enabled}
        size="small"
        style={variant === 'panel' ? { flexShrink: 0 } : undefined}
        onChange={(checked) => onToggle(item, checked)}
      />
    </Flexbox>
  );
};

/**
 * An Agent's recurring tasks on its profile: what runs, when, and a switch for each.
 * `contact` lays it out as a box matching the info list on a contact card.
 */
export function AgentSchedules({
  agentId,
  variant = 'panel',
}: {
  agentId: string;
  variant?: AgentSchedulesVariant;
}) {
  const { t } = useTranslation('channel');
  const [expanded, setExpanded] = useState(false);
  // The mode each row was switched off from, so switching it back on restores it.
  const [offModes, setOffModes] = useState<Record<string, TaskAutomationMode>>({});

  const query = useMemo(() => schedulesQuery(agentId), [agentId]);
  const useFetchTaskList = useTaskStore((s) => s.useFetchTaskList);
  useFetchTaskList(query, SYNC_OPTIONS);
  const tasks = useTaskStore(useMemo(() => taskListSelectors.taskList(query), [query]));
  const setTaskAutomationMode = useTaskStore((s) => s.setTaskAutomationMode);

  const schedules = useMemo(
    () => (tasks ?? []).map((task) => toAgentSchedule(task, offModes[task.id])),
    [tasks, offModes],
  );

  const handleToggle = useCallback(
    async (item: AgentSchedule, enabled: boolean) => {
      if (!enabled) setOffModes((prev) => ({ ...prev, [item.id]: item.mode }));
      try {
        await setTaskAutomationMode(item.id, enabled ? item.mode : null);
      } catch {
        toast.error(t('profile.schedules.toggleFailed'));
      }
    },
    [setTaskAutomationMode, t],
  );

  if (schedules.length === 0) return null;

  const visible = expanded ? schedules : schedules.slice(0, AGENT_SCHEDULES_COLLAPSED);
  const hasMore = schedules.length > AGENT_SCHEDULES_COLLAPSED;

  const label = <span {...stylex.props(styles.label)}>{t('profile.schedules')}</span>;
  const list = (
    <>
      {visible.map((item) => (
        <ScheduleRow item={item} key={item.id} variant={variant} onToggle={handleToggle} />
      ))}
      {hasMore && (
        <Button
          block
          aria-expanded={variant === 'panel' ? expanded : undefined}
          size="small"
          type="text"
          {...stylex.props(styles.more, variant === 'contact' && styles.contactMore)}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t('profile.schedules.collapse') : t('profile.schedules.expand')}
        </Button>
      )}
    </>
  );

  if (variant === 'contact')
    return (
      <Flexbox {...stylex.props(styles.contactCard)}>
        <div {...stylex.props(styles.contactLabel)}>{label}</div>
        {list}
      </Flexbox>
    );

  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Text fontSize={13} type="secondary" weight={400}>
        {t('profile.schedules')}
      </Text>
      <Surface
        aria-label={t('profile.schedules')}
        padded={false}
        role="group"
        {...stylex.props(agentProfileStyles.card)}
      >
        {list}
      </Surface>
    </Flexbox>
  );
}
