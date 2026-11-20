import { Text } from '@lobehub/ui';
import { agentSecondaryDisplayName, type ChannelReplyJob } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

import { activityLabel } from './activityLabel';
import { memberJobStatus } from './jobStatus';
import { activityStyles } from './styles';
import { TypingDots } from './TypingDots';

/**
 * The role a direct conversation's Agent plays, after its name in the header, as in Contacts. An
 * Agent titled by its role alone shows nothing more. While the Agent works on a reply, in the
 * conversation or any of its threads, the header says so instead, like a chat app's "typing…";
 * working in two or more at once, it says how many.
 */
export function DirectAgentRole({
  agentId,
  count = 0,
  job,
}: {
  agentId: string;
  /** Conversations (the main one and its Threads) the Agent is working in at once. */
  count?: number;
  job?: ChannelReplyJob;
}) {
  const { t } = useTranslation('channel');
  const useHydrateAgentConfig = useAgentStore((s) => s.useHydrateAgentConfig);
  // A Channel has no active Agent, so nothing else loads this one's config.
  useHydrateAgentConfig(true, agentId);
  const role = agentSecondaryDisplayName(useAgentStore(agentSelectors.getAgentMetaById(agentId)));
  if (job)
    return (
      <Text type="secondary">
        <span role="status" {...stylex.props(activityStyles.line)}>
          {activityLabel(count > 1 ? t('activity.parallel', { count }) : t(memberJobStatus(job)))}
          <TypingDots />
        </span>
      </Text>
    );
  if (!role) return null;

  return (
    <Text ellipsis title={role} type="secondary">
      {role}
    </Text>
  );
}
