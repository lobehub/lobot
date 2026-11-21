import { Popover, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ContactCard } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import AgentProfilePopup from '@/features/AgentProfileCard/AgentProfilePopup';
import { DeferredHoverCard } from '@/features/Channels/DeferredHoverCard';
import { PersonCardFrame } from '@/features/Channels/MemberProfilePopup';
import { PersonAction } from '@/features/Channels/PersonAction';
import { SHARED_AGENT_URL } from '@/features/ContactList/const';
import { cardPopoverProps } from '@/styles/cardPopover';

import { contactCardName } from './cardText';

const AVATAR_SIZE = 48;

const styles = stylex.create({
  // A chat app's contact card: a light filled block, avatar and name over what kind of card it is.
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 320,
    marginBlock: 0,
    marginInline: 0,
    paddingBlockStart: 12,
    paddingBlockEnd: 8,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: cssVar.borderRadiusLG,
    font: 'inherit',
    color: cssVar.colorText,
    textAlign: 'start',
    backgroundColor: {
      'default': cssVar.colorFillTertiary,
      ':hover': cssVar.colorFillSecondary,
    },
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
  },
  static: {
    alignSelf: 'stretch',
    backgroundColor: cssVar.colorFillTertiary,
    cursor: 'default',
  },
  head: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    minWidth: 0,
    paddingBlockEnd: 12,
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  name: {
    overflow: 'hidden',
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.4,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  secondary: {
    overflow: 'hidden',
    fontSize: 12,
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footer: {
    fontSize: 12,
    color: cssVar.colorTextTertiary,
  },
});

/** Whose card it is, under the name: a person's handle, or whose Agent it is. */
const useCardSecondary = (card: ContactCard) => {
  const { t } = useTranslation('channel');
  return card.type === 'user'
    ? card.username && `@${card.username}`
    : card.ownerName && t('contactCard.agentOwner', { name: card.ownerName });
};

/** The card's face: avatar and name, then what kind of card it is. */
const ContactCardFace = ({ card }: { card: ContactCard }) => {
  const { t } = useTranslation('channel');
  const name = contactCardName(card);
  const secondary = useCardSecondary(card);

  return (
    <>
      <span {...stylex.props(styles.head)}>
        {card.type === 'user' ? (
          <UserAvatar avatar={card.avatar} name={name} shape={'square'} size={AVATAR_SIZE} />
        ) : (
          <AgentAvatar
            agentId={card.agentId}
            avatar={card.avatar}
            background={card.backgroundColor || undefined}
            name={name}
            shape={'square'}
            size={AVATAR_SIZE}
          />
        )}
        <span {...stylex.props(styles.text)}>
          <span {...stylex.props(styles.name)}>{name}</span>
          {secondary && <span {...stylex.props(styles.secondary)}>{secondary}</span>}
        </span>
      </span>
      <span {...stylex.props(styles.footer)}>
        {t(card.type === 'user' ? 'contactCard.label.user' : 'contactCard.label.agent')}
      </span>
    </>
  );
};

/** The card as it will read once sent, for the share dialog. Not clickable. */
export const ContactCardPreview = ({ card }: { card: ContactCard }) => (
  <div data-testid={'contact-card-preview'} {...stylex.props(styles.card, styles.static)}>
    <ContactCardFace card={card} />
  </div>
);

type UserCard = Extract<ContactCard, { type: 'user' }>;

/** The person's profile card, as a Channel member's avatar opens it, from the card's snapshot. */
const PersonCardProfile = ({ card, name }: { card: UserCard; name: string }) => (
  <PersonCardFrame
    avatar={<UserAvatar avatar={card.avatar} name={name} shape={'circle'} size={42} />}
    image={card.avatar}
    name={name}
  >
    {card.username && (
      <Text ellipsis fontSize={12} type={'secondary'}>
        @{card.username}
      </Text>
    )}
    <PersonAction userId={card.userId} />
  </PersonCardFrame>
);

/**
 * A contact card in a Channel message, drawn from the snapshot the server stored when it was sent.
 * Clicking it opens the profile card in place, the same one an avatar opens; its actions message
 * or add the contact, and "View profile" goes on to Contacts.
 */
export const ContactCardMessage = ({ card }: { card: ContactCard }) => {
  const { t } = useTranslation('channel');
  const name = contactCardName(card);
  const label = t(card.type === 'user' ? 'contactCard.label.user' : 'contactCard.label.agent');

  const trigger = (
    <div
      aria-label={`${label}: ${name}`}
      data-testid={'contact-card'}
      role={'button'}
      tabIndex={0}
      {...stylex.props(styles.card)}
    >
      <ContactCardFace card={card} />
    </div>
  );

  return (
    <DeferredHoverCard
      openOn={'click'}
      render={(node: ReactElement, control) =>
        card.type === 'user' ? (
          <Popover
            {...cardPopoverProps}
            content={<PersonCardProfile card={card} name={name} />}
            nativeButton={false}
            open={control?.open}
            placement={'right'}
            trigger={'click'}
            onOpenChange={control?.onOpenChange}
          >
            {node}
          </Popover>
        ) : (
          <AgentProfilePopup
            agent={{ avatar: card.avatar, backgroundColor: card.backgroundColor, title: name }}
            agentId={card.agentId}
            highlightTrigger={false}
            open={control?.open}
            placement={'right'}
            shareUrl={SHARED_AGENT_URL(card.shareId)}
            trigger={'click'}
            onOpenChange={control?.onOpenChange}
          >
            {node}
          </AgentProfilePopup>
        )
      }
    >
      {trigger}
    </DeferredHoverCard>
  );
};
