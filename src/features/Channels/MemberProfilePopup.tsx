import { Flexbox, Popover, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import PersonAvatar from '@/components/UserAvatar';
import AgentProfilePopup from '@/features/AgentProfileCard/AgentProfilePopup';
import { cardStyles } from '@/features/AgentViewAll/AgentCard';
import { cardPopoverProps } from '@/styles/cardPopover';

import { type DeferredCardControl, DeferredHoverCard } from './DeferredHoverCard';
import { MemberAvatar } from './MemberAvatar';
import { memberAvatar, memberName } from './memberName';
import { PersonAction } from './PersonAction';

// Same shape as the Agent profile card (`AgentProfileCard`): a banner, a round avatar with a
// ring over its edge, then text. A person has no banner of their own, so theirs blurs the avatar.
const styles = stylex.create({
  banner: {
    position: 'relative',
    overflow: 'hidden',
    height: 60,
    backgroundColor: cssVar.colorFillTertiary,
  },
  bannerImage: {
    position: 'absolute',
    insetBlockStart: '50%',
    insetInlineStart: '50%',
    transform: 'translate(-50%, -50%)',
    filter: 'blur(44px)',
  },
  body: {
    marginBlockStart: -24,
    paddingBlockEnd: 16,
    paddingInline: 16,
  },
  card: {
    overflow: 'hidden',
    width: 280,
    backgroundColor: cssVar.colorBgElevated,
  },
  name: {
    fontSize: 16,
    fontWeight: 600,
    color: cssVar.colorText,
  },
});

/** The person card's shape: a blurred banner of the avatar, the avatar over its edge, then text. */
export const PersonCardFrame = ({
  avatar,
  children,
  image,
  name,
}: {
  /** The avatar drawn over the banner's edge. Pass size 42; the ring makes the disc 48px. */
  avatar: ReactNode;
  children?: ReactNode;
  /** The avatar image the banner blurs. */
  image: string | null | undefined;
  name: string;
}) => (
  <Flexbox {...stylex.props(styles.card)}>
    <div {...stylex.props(styles.banner)}>
      <span {...stylex.props(styles.bannerImage)}>
        {/* Without an image, the banner blurs the person's generated pixel avatar. */}
        <PersonAvatar avatar={image} name={name} shape={'square'} size={400} />
      </span>
    </div>
    <Flexbox gap={8} {...stylex.props(styles.body)}>
      <span
        className={cardStyles.avatarRing}
        style={{ alignSelf: 'flex-start', boxSizing: 'border-box', height: 48, width: 48 }}
      >
        {avatar}
      </span>
      <Flexbox gap={2} style={{ minWidth: 0 }}>
        <Text ellipsis {...stylex.props(styles.name)}>
          {name}
        </Text>
        {children}
      </Flexbox>
    </Flexbox>
  </Flexbox>
);

/**
 * A person's card: who they are in the Channel, and a way to message them one-on-one. Agents keep
 * their own profile card.
 */
export const PersonProfileCard = ({ member }: { member: ChannelPublicMember }) => {
  const { t, i18n } = useTranslation('channel');
  const name = memberName(member, t('deletedMember'));
  // Every person's card shows the handle, even when it matches the name (`AmAzing-` / `amazing-`),
  // so the cards read the same; only a person without one goes without.
  const handle = member.username ? `@${member.username}` : undefined;
  const joinedAt = new Date(member.joinedAt);
  const joined = Number.isNaN(joinedAt.getTime())
    ? undefined
    : t('memberProfile.joinedAt', {
        date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(joinedAt),
      });

  return (
    <PersonCardFrame
      avatar={<MemberAvatar member={member} size={42} />}
      image={memberAvatar(member)}
      name={name}
    >
      {handle && (
        <Text ellipsis fontSize={12} type={'secondary'}>
          {handle}
        </Text>
      )}
      {joined && (
        <Text ellipsis fontSize={12} type={'secondary'}>
          {joined}
        </Text>
      )}
      {member.userId && <PersonAction userId={member.userId} />}
    </PersonCardFrame>
  );
};

/**
 * A Channel member's card: an Agent's profile card, or a person's card with their handle and when
 * they joined. An avatar opens it on click. A mention opens it on hover. A roster click can hold
 * it open while that row is selected.
 */
export const MemberProfilePopup = ({
  children,
  extra,
  highlightTrigger,
  member,
  onOpenChange,
  open,
  placement = 'top',
  trigger = 'hover',
}: {
  children: ReactElement;
  /** Drawn inside the card, under the profile. The roster uses it for work in progress. */
  extra?: ReactNode;
  /** Off when the roster row already shows the selection, so the trigger does not paint a second fill. */
  highlightTrigger?: boolean;
  member: ChannelPublicMember | undefined;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  /** Where the card opens; the member panel sits at the right edge, so it opens to the left. */
  placement?: 'left' | 'top';
  /** Hover for a mention. Click for an avatar, and for the roster, where the row is the selection. */
  trigger?: 'click' | 'hover';
}) => {
  const { t } = useTranslation('channel');
  if (!member) return children;
  const popup = (triggerNode: ReactElement, control?: DeferredCardControl) => {
    const cardOpen = control?.open ?? open;
    const cardChange = (next: boolean) => {
      control?.onOpenChange(next);
      onOpenChange?.(next);
    };
    return member.agentId ? (
      <AgentProfilePopup
        agentId={member.agentId}
        environment={member.environment}
        extra={extra}
        highlightTrigger={highlightTrigger}
        open={cardOpen}
        placement={placement}
        trigger={trigger}
        agent={{
          avatar: member.avatar,
          description: member.description,
          title: memberName(member, t('deletedMember')),
        }}
        onOpenChange={cardChange}
      >
        {triggerNode}
      </AgentProfilePopup>
    ) : (
      <Popover
        {...cardPopoverProps}
        content={<PersonProfileCard member={member} />}
        nativeButton={false}
        open={cardOpen}
        placement={placement}
        trigger={trigger}
        onOpenChange={cardChange}
      >
        {triggerNode}
      </Popover>
    );
  };
  // A roster click has to land on a popup that is already mounted. An avatar click mounts the
  // card on the first press and opens it then. A mention waits for hover.
  if (trigger === 'click' && open === undefined) {
    return (
      <DeferredHoverCard openOn={'click'} render={popup}>
        {children}
      </DeferredHoverCard>
    );
  }
  if (trigger === 'click') return popup(children);
  return <DeferredHoverCard render={popup}>{children}</DeferredHoverCard>;
};
