import type { ContactUserProfile } from '@lobot/types';
import { Popover, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

import UserAvatar from '@/components/UserAvatar';
import { personName } from '@/features/AddContactModal/result';
import { PERSON_CONTACT_URL } from '@/features/ContactList/const';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';

import { PersonCardFrame } from './MemberProfilePopup';
import { ContactAction } from './PersonAction';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginInline: -6,
    paddingBlock: 4,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: 6,
    color: cssVar.colorText,
    textAlign: 'start',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
    cursor: 'pointer',
  },
});

/**
 * The person who shared a direct conversation's Agent: from the contact entry it was reached
 * through, or else its share. Undefined for one's own Agent, and while neither has loaded.
 */
export const useSharedAgentOwner = (
  channelId: string,
  agentId: string,
): ContactUserProfile | undefined => {
  // undefined: one's own Agent; null: a shared Agent without a known handle.
  const handle = useChannelStore((s) => {
    const item = channelSelectors.list(s)?.find((channel) => channel.id === channelId);
    return item?.sharedAgent ? (item.sharedAgentHandle ?? null) : undefined;
  });
  const shared = handle !== undefined;
  contactActions.useFetchList(shared);
  const listReady = useContactStore(contactSelectors.isListInit);
  const contactOwner = useContactStore((s) => contactSelectors.agentById(agentId)(s)?.agent.owner);
  // A conversation whose contact entry was since removed still names its owner by the share.
  contactActions.useFetchShare(
    shared && listReady && !contactOwner ? (handle ?? undefined) : undefined,
  );
  const shareOwner = useContactStore((s) =>
    handle ? contactSelectors.sharedAgent(handle)(s)?.agent.owner : undefined,
  );

  return shared ? (contactOwner ?? shareOwner) : undefined;
};

/** The owner's hover card: who they are, and the one thing to do next. */
export const SharedAgentOwnerCard = ({ owner }: { owner: ContactUserProfile }) => {
  const name = personName(owner);

  return (
    <PersonCardFrame
      avatar={<UserAvatar avatar={owner.avatar} name={name} shape={'circle'} size={48} />}
      image={owner.avatar}
      name={name}
    >
      {owner.username && (
        <Text ellipsis fontSize={12} type={'secondary'}>
          @{owner.username}
        </Text>
      )}
      <ContactAction userId={owner.id} />
    </PersonCardFrame>
  );
};

/** The Agent profile's "Shared by" row: hover for the owner's card, click for their page. */
export const SharedAgentOwner = ({ owner }: { owner: ContactUserProfile }) => {
  const navigate = useWorkspaceAwareNavigate();
  const name = personName(owner);

  return (
    <Popover
      content={<SharedAgentOwnerCard owner={owner} />}
      placement={'left'}
      styles={{ content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
      trigger={'hover'}
    >
      <button
        type="button"
        onClick={() => navigate(PERSON_CONTACT_URL(owner.id))}
        {...stylex.props(styles.row)}
      >
        <UserAvatar avatar={owner.avatar} name={name} shape={'circle'} size={24} />
        <Text ellipsis fontSize={13}>
          {name}
        </Text>
      </button>
    </Popover>
  );
};
