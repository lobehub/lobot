import { Button, Flexbox, Icon, Switch, Text, toast } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { ClockIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClientDataSWR } from '@/libs/swr';
import { taskService } from '@/services/task';

import {
  type AgentSchedule,
  agentScheduleTime,
  mergeAgentSchedules,
  toAgentSchedule,
} from './agentSchedules';

/** Rows shown before "Show all". */
export const AGENT_SCHEDULES_COLLAPSED = 5;
const FETCH_LIMIT = 50;

const styles = stylex.create({
  card: {
    overflow: 'hidden',
    borderRadius: '10px',
    backgroundColor: cssVar.colorFillQuaternary,
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
    paddingBlock: '8px',
    paddingInline: '12px',
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

const ScheduleRow = ({
  item,
  onToggle,
  pending,
}: {
  item: AgentSchedule;
  onToggle: (item: AgentSchedule, enabled: boolean) => void;
  pending: boolean;
}) => {
  const { t } = useTranslation('chat');
  const time = agentScheduleTime(item, t);

  return (
    <Flexbox horizontal align="center" gap={10} {...stylex.props(styles.row)}>
      <Icon color={cssVar.colorTextTertiary} icon={ClockIcon} size={16} />
      <Flexbox flex={1} style={{ minWidth: 0 }}>
        <Text ellipsis fontSize={13} weight={500}>
          {item.name}
        </Text>
        {time && <span {...stylex.props(styles.time)}>{time}</span>}
      </Flexbox>
      <Switch
        aria-label={item.name}
        checked={item.enabled}
        loading={pending}
        size="small"
        onChange={(checked) => onToggle(item, checked)}
      />
    </Flexbox>
  );
};

/** An Agent's recurring tasks on its profile: what runs, when, and a switch for each. */
export function AgentSchedules({ agentId }: { agentId: string }) {
  const { t } = useTranslation('channel');
  const [expanded, setExpanded] = useState(false);
  const [toggled, setToggled] = useState<Record<string, AgentSchedule>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const { data } = useClientDataSWR(['channel:agentSchedules', agentId], () =>
    taskService.list({
      assigneeAgentId: agentId,
      automated: true,
      limit: FETCH_LIMIT,
      orderBy: 'createdAt',
    }),
  );

  const schedules = useMemo(() => {
    const fetched = (data?.data ?? []).flatMap((task) => toAgentSchedule(task) ?? []);
    return mergeAgentSchedules(fetched, toggled);
  }, [data, toggled]);

  const handleToggle = useCallback(
    async (item: AgentSchedule, enabled: boolean) => {
      setToggled((prev) => ({ ...prev, [item.id]: { ...item, enabled } }));
      setPending((prev) => ({ ...prev, [item.id]: true }));
      try {
        await taskService.update(item.id, { automationMode: enabled ? item.mode : null });
      } catch {
        setToggled((prev) => ({ ...prev, [item.id]: item }));
        toast.error(t('profile.schedules.toggleFailed'));
      } finally {
        setPending((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [t],
  );

  if (schedules.length === 0) return null;

  const visible = expanded ? schedules : schedules.slice(0, AGENT_SCHEDULES_COLLAPSED);
  const hasMore = schedules.length > AGENT_SCHEDULES_COLLAPSED;

  return (
    <Flexbox gap={6}>
      <span {...stylex.props(styles.label)}>{t('profile.schedules')}</span>
      <Flexbox {...stylex.props(styles.card)}>
        {visible.map((item) => (
          <ScheduleRow
            item={item}
            key={item.id}
            pending={!!pending[item.id]}
            onToggle={handleToggle}
          />
        ))}
        {hasMore && (
          <Button
            block
            size="small"
            type="text"
            {...stylex.props(styles.more)}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? t('profile.schedules.collapse') : t('profile.schedules.expand')}
          </Button>
        )}
      </Flexbox>
    </Flexbox>
  );
}
