'use client';

import { AGENT_CHAT_URL } from '@lobechat/const';
import { createStaticStyles } from '@lobehub/ui';
import { ChevronRight } from 'lucide-react';
import { memo } from 'react';

import AgentAvatar from '@/components/AgentAvatar';
import { useAgentConversationLink } from '@/features/MessageList/useAgentConversationLink';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';

import { type MarkdownElementProps } from '../../type';

const styles = createStaticStyles(({ css, cssVar }) => ({
  arrow: css`
    flex-shrink: 0;
    color: ${cssVar.colorTextQuaternary};
    transition:
      color 0.15s,
      transform 0.15s;
  `,
  // An inline card sized to its content, not a full-width banner across the message.
  card: css`
    cursor: pointer;

    display: flex;
    gap: 10px;
    align-items: center;

    box-sizing: border-box;
    width: fit-content;
    min-width: 240px;
    max-width: min(100%, 380px);
    margin-block: 4px;
    padding-block: 8px;
    padding-inline: 10px 12px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 12px;

    color: inherit !important;
    text-decoration: none !important;

    background: ${cssVar.colorBgContainer};

    transition:
      border-color 0.15s,
      background 0.15s;

    &:hover {
      border-color: ${cssVar.colorBorder};
      background: ${cssVar.colorFillQuaternary};
    }

    &:hover .lobe-agents-arrow {
      transform: translateX(2px);
      color: ${cssVar.colorTextSecondary};
    }
  `,
  // Lets the text column shrink so the title and description ellipsize inside the card.
  content: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;

    min-width: 0;
  `,
  description: css`
    overflow: hidden;

    font-size: 12px;
    line-height: 18px;
    color: ${cssVar.colorTextTertiary};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  title: css`
    overflow: hidden;

    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    color: ${cssVar.colorText};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface LobeAgentsProps extends MarkdownElementProps {
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  identifier: string;
  title: string;
}

const Render = memo<LobeAgentsProps>(
  ({ identifier, title, description, avatar, backgroundColor }) => {
    // Opens the person's direct Channel with the Agent, the same way an Agent row does.
    const link = useAgentConversationLink(identifier || undefined, AGENT_CHAT_URL(identifier));

    if (!identifier) return null;

    return (
      <WorkspaceLink className={styles.card} to={link.url} onClick={link.onClick}>
        <AgentAvatar
          agentId={identifier}
          avatar={avatar}
          background={backgroundColor}
          name={title || undefined}
          size={36}
          title={title || undefined}
        />
        <span className={styles.content}>
          <span className={styles.title}>{title || identifier}</span>
          {description && <span className={styles.description}>{description}</span>}
        </span>
        <ChevronRight className={`${styles.arrow} lobe-agents-arrow`} size={16} />
      </WorkspaceLink>
    );
  },
);

Render.displayName = 'LobeAgentsRender';

export default Render;
