import { CHANNEL_URL } from '@lobechat/const';
import { Button, Skeleton, toast } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { CheckIcon, MessageCircleIcon, UserRoundPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspace } from '@/business/client/hooks/useActiveWorkspace';
import {
  useWorkspaceMembers,
  useWorkspaceMembersReady,
} from '@/business/client/hooks/useWorkspaceMembers';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions } from '@/store/channel';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

const styles = stylex.create({
  action: {
    marginBlockStart: 10,
  },
});

const ActionSkeleton = () => (
  <Skeleton height={24} radius={6} style={{ marginBlockStart: 10 }} width={'100%'} />
);

/** Runs a card action with a pending flag and the shared failure toast. */
const usePendingRun = () => {
  const { t } = useTranslation('common');
  const [pending, setPending] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    try {
      await action();
    } catch (error) {
      console.error('[channel] Person card action failed', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setPending(false);
    }
  };

  return { pending, run };
};

/** Opens the one-on-one conversation with this person in the active scope and goes there. */
const MessageButton = ({ userId }: { userId: string }) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const { pending, run } = usePendingRun();

  return (
    <Button
      block
      icon={MessageCircleIcon}
      loading={pending}
      size={'small'}
      {...stylex.props(styles.action)}
      onClick={() =>
        run(async () => {
          const channelId = await channelActions.openPeer(userId);
          if (channelId) navigate(CHANNEL_URL(channelId));
        })
      }
    >
      {t('contacts.sendMessage')}
    </Button>
  );
};

/** What to do with a person by our contact relation: message a contact, or ask to become one. */
export const ContactAction = ({ userId }: { userId: string }) => {
  const { t } = useTranslation('common');
  contactActions.useFetchProfile(userId);
  contactActions.useFetchRequests();
  const relation = useContactStore((s) => contactSelectors.profile(userId)(s)?.relation);
  const request = useContactStore((s) =>
    contactSelectors.requests(s).find((item) => item.user.id === userId),
  );
  const { pending, run } = usePendingRun();

  if (!relation) return <ActionSkeleton />;

  switch (relation) {
    case 'contact': {
      return <MessageButton userId={userId} />;
    }
    case 'none': {
      return (
        <Button
          block
          icon={UserRoundPlusIcon}
          loading={pending}
          size={'small'}
          type={'primary'}
          {...stylex.props(styles.action)}
          onClick={() => run(() => contactActions.sendRequest(userId))}
        >
          {t('contacts.person.request')}
        </Button>
      );
    }
    case 'request_sent': {
      return (
        <Button block disabled icon={CheckIcon} size={'small'} {...stylex.props(styles.action)}>
          {t('contacts.person.requestSent')}
        </Button>
      );
    }
    case 'request_received': {
      if (!request) return null;
      return (
        <Button
          block
          icon={CheckIcon}
          loading={pending}
          size={'small'}
          type={'primary'}
          {...stylex.props(styles.action)}
          onClick={() => run(() => contactActions.acceptRequest(request))}
        >
          {t('contacts.person.accept')}
        </Button>
      );
    }
    default: {
      return null;
    }
  }
};

/** In a workspace, fellow members message each other directly; anyone else gets no action. */
const WorkspaceMemberAction = ({ userId }: { userId: string }) => {
  const ready = useWorkspaceMembersReady();
  const isMember = useWorkspaceMembers().some((member) => member.userId === userId);

  if (!ready) return <ActionSkeleton />;
  return isMember ? <MessageButton userId={userId} /> : null;
};

/**
 * The action on a Channel member's card, matching who the server lets talk one-on-one: in a
 * workspace, two of its current members; in the personal space, two mutual contacts (so others
 * get "Add contact" instead). Nothing on one's own card.
 */
export const PersonAction = ({ userId }: { userId: string }) => {
  const workspace = useActiveWorkspace();
  const myId = useUserStore(userProfileSelectors.userId);

  if (userId === myId) return null;
  return workspace ? <WorkspaceMemberAction userId={userId} /> : <ContactAction userId={userId} />;
};
