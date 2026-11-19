'use client';

import { createStaticStyles, cx, Flexbox, Skeleton, Text, Tooltip } from '@lobehub/ui';
import { type SidebarAgentItem } from '@lobot/types';
import { type CSSProperties, memo, type ReactNode } from 'react';

import AgentAvatar from '@/components/AgentAvatar';
import { cardStyles } from '@/features/AgentViewAll/AgentCard';
import { coverPattern } from '@/features/AgentViewAll/coverColor';
import { resolveAgentBadge } from '@/features/AgentViewAll/resolveAgentBadge';
import { useAgentCoverColor } from '@/features/AgentViewAll/useAgentCoverColor';

const styles = createStaticStyles(({ css, cssVar }) => ({
  avatar: css`
    align-self: flex-start;
    align-items: center;
    justify-content: center;

    /* The ring's border sits inside this box, so the avatar stays 48px over the banner. */
    box-sizing: border-box;
    width: 48px;
    height: 48px;
    padding: 0;

    font: inherit;
    color: inherit;
  `,
  banner: css`
    position: relative;

    overflow: hidden;
    display: block;

    width: 100%;
    height: 60px;
    margin: 0;
    padding: 0;
    border: none;

    background: none;
  `,
  clickableAvatar: css`
    cursor: pointer;
  `,
  clickableTitle: css`
    cursor: pointer;

    &:hover {
      color: ${cssVar.colorPrimary};
    }
  `,
  container: css`
    overflow: hidden;
    width: 280px;
    background: ${cssVar.colorBgElevated};
  `,
  description: css`
    overflow: hidden;

    max-height: 80px;

    font-size: 12px;
    line-height: 1.5;
    color: ${cssVar.colorTextSecondary};
    text-overflow: ellipsis;
  `,
  header: css`
    position: relative;
    margin-block-start: -24px;
    padding-inline: 16px;
  `,
  name: css`
    font-size: 16px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
}));

interface AgentProfileCardProps {
  /** Seeds the generated avatar of an agent without one. */
  agentId?: string | null;
  avatar?: string | null;
  backgroundColor?: string | null;
  children?: ReactNode;
  description?: string | null;
  headerAction?: ReactNode;
  /** Show inline skeletons for fields that are still loading. */
  loading?: boolean;
  /** When set, avatar + title become clickable and trigger this handler. */
  onHeaderClick?: () => void;
  title: string;
}

const COVER_STUB = { pinned: false, type: 'agent' as const, updatedAt: new Date(0) };

const AgentProfileCard = memo<AgentProfileCardProps>(
  ({
    agentId,
    avatar,
    backgroundColor,
    description,
    headerAction,
    loading,
    onHeaderClick,
    title,
    children,
  }) => {
    // The same cover the contacts wall paints: the uploaded banner, or the agent's own
    // tint and texture. A blurred copy of the avatar is not a banner.
    const coverItem: SidebarAgentItem = {
      ...COVER_STUB,
      avatar,
      backgroundColor,
      id: agentId || title,
      title,
    };
    const badge = resolveAgentBadge(coverItem);
    const coverColor = useAgentCoverColor(coverItem, badge.cover, !!badge.coverImage);

    const cover = (
      <div
        className={cardStyles.cover}
        data-cover-image={badge.coverImage ? '' : undefined}
        data-pattern={badge.coverImage ? undefined : coverPattern(coverItem)}
        style={
          {
            '--agent-cover': coverColor,
            'backgroundImage': badge.coverImage
              ? `url(${JSON.stringify(badge.coverImage)})`
              : undefined,
            'height': '100%',
          } as CSSProperties
        }
      />
    );
    const portrait = (
      <AgentAvatar
        agentId={agentId}
        avatar={avatar}
        background={badge.cover}
        name={title}
        shape={'circle'}
        size={42}
      />
    );
    const ringClass = cx(
      cardStyles.avatarRing,
      !badge.cover && cardStyles.avatarPlain,
      styles.avatar,
      onHeaderClick && styles.clickableAvatar,
    );

    return (
      <Flexbox className={styles.container}>
        {/* The whole header opens the Agent's page, not only its small avatar and name. */}
        {onHeaderClick ? (
          <button
            className={cx(styles.banner, styles.clickableAvatar)}
            type={'button'}
            onClick={onHeaderClick}
          >
            {cover}
          </button>
        ) : (
          <div className={styles.banner}>{cover}</div>
        )}

        <Flexbox className={styles.header} gap={8}>
          {onHeaderClick ? (
            <button className={ringClass} type={'button'} onClick={onHeaderClick}>
              {portrait}
            </button>
          ) : (
            <span className={ringClass}>{portrait}</span>
          )}
          <Flexbox gap={2}>
            <Flexbox horizontal align={'center'} justify={'space-between'}>
              <Text
                ellipsis
                className={`${styles.name} ${onHeaderClick ? styles.clickableTitle : ''}`}
                onClick={onHeaderClick}
              >
                {title}
              </Text>
              {headerAction}
            </Flexbox>
            {description ? (
              <Tooltip title={description}>
                <Text className={styles.description} ellipsis={{ rows: 2 }}>
                  {description}
                </Text>
              </Tooltip>
            ) : loading ? (
              <Skeleton.Text rows={2} width={['100%', '60%']} />
            ) : null}
          </Flexbox>
        </Flexbox>

        {children}
      </Flexbox>
    );
  },
);

export default AgentProfileCard;
