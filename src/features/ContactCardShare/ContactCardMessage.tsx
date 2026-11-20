import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ContactCard } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { PERSON_CONTACT_URL, SHARED_AGENT_URL } from '@/features/ContactList/const';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import { contactCardName } from './cardText';

const AVATAR_SIZE = 48;

const styles = stylex.create({
  // A chat app's contact card: avatar and name over a hairline, then what kind of card it is.
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
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      'default': cssVar.colorBorderSecondary,
      ':hover': cssVar.colorBorder,
    },
    borderRadius: cssVar.borderRadiusLG,
    font: 'inherit',
    color: cssVar.colorText,
    textAlign: 'start',
    backgroundColor: cssVar.colorBgContainer,
    cursor: 'pointer',
    transitionProperty: 'border-color',
    transitionDuration: '0.15s',
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
    paddingBlockStart: 8,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
    fontSize: 12,
    color: cssVar.colorTextTertiary,
  },
});

/**
 * A contact card in a Channel message, drawn from the snapshot the server stored when it was sent.
 * Clicking it opens the live profile in Contacts, where the reader can add or message it.
 */
export const ContactCardMessage = ({ card }: { card: ContactCard }) => {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const name = contactCardName(card);
  const label = t(card.type === 'user' ? 'contactCard.label.user' : 'contactCard.label.agent');
  const secondary =
    card.type === 'user'
      ? card.username && `@${card.username}`
      : card.ownerName && t('contactCard.agentOwner', { name: card.ownerName });

  return (
    <button
      aria-label={`${label}: ${name}`}
      data-testid={'contact-card'}
      type={'button'}
      onClick={() =>
        navigate(
          card.type === 'user' ? PERSON_CONTACT_URL(card.userId) : SHARED_AGENT_URL(card.shareId),
        )
      }
      {...stylex.props(styles.card)}
    >
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
      <span {...stylex.props(styles.footer)}>{label}</span>
    </button>
  );
};
