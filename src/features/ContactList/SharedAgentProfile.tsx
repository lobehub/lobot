'use client';

import type { ContactAgentProfile, ContactSearchResult } from '@lobechat/types';
import { Empty, Flexbox, Skeleton, Text, toast } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  MessageCircleIcon,
  UserRoundCheckIcon,
  UserRoundPlusIcon,
  UserRoundXIcon,
} from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { personName } from '@/features/AddContactModal/result';
import NavHeader from '@/features/NavHeader';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';

import { AVATAR_SIZE, COVER_HEIGHT, styles, TileContent } from './cardParts';
import { CONTACT_URL } from './const';
import { ContactInfo } from './ContactInfo';
import { useMessageSharedAgent } from './useMessageSharedAgent';

const localStyles = stylex.create({
  cover: {
    backgroundColor: cssVar.colorFillSecondary,
  },
});

type SharedAgentResult = Extract<ContactSearchResult, { type: 'agent' }>;

/**
 * Another person's shared Agent, reached by its share (a share page's "Open in Lobot", or a
 * pasted link): who it is and who made it, with the two things to do with it — message it now,
 * no friendship needed, or add it to contacts to come back to it.
 */
const SharedAgentProfileCard = memo<{ result: SharedAgentResult }>(({ result }) => {
  const { t } = useTranslation('common');
  const { agent, relation } = result;
  const title = agent.title || t('untitledAgent', { ns: 'chat' });
  const owner = personName(agent.owner);
  const { message, opening } = useMessageSharedAgent();
  const [adding, setAdding] = useState(false);
  const added = relation === 'contact';

  const add = async (profile: ContactAgentProfile) => {
    setAdding(true);
    try {
      await contactActions.addAgent(profile.shareId);
      toast.success(t('contacts.agent.added'));
    } catch (error) {
      console.error('[contacts] Failed to add a shared Agent', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div {...stylex.props(styles.cover, localStyles.cover)}>
        {/* The Agent's own colour, when it has one, fills the neutral cover. */}
        {agent.backgroundColor && (
          <div style={{ background: agent.backgroundColor, height: '100%' }} />
        )}
      </div>
      <Flexbox align={'center'} gap={8} {...stylex.props(styles.body)}>
        <span {...stylex.props(styles.avatar)}>
          <AgentAvatar
            agentId={agent.agentId}
            avatar={agent.avatar}
            background={agent.backgroundColor || undefined}
            name={title}
            shape={'circle'}
            size={AVATAR_SIZE}
          />
        </span>
        <Text ellipsis as={'h1'} fontSize={22} style={{ margin: 0, maxWidth: '100%' }} weight={600}>
          {title}
        </Text>
        {owner && <Text type={'secondary'}>{t('contacts.agent.byOwner', { name: owner })}</Text>}
        <div {...stylex.props(styles.actions)}>
          <button
            disabled={opening}
            type="button"
            onClick={() => void message(agent)}
            {...stylex.props(styles.tile)}
          >
            <TileContent icon={MessageCircleIcon} label={t('contacts.sendMessage')} />
          </button>
          <button
            disabled={added || adding}
            type="button"
            onClick={() => void add(agent)}
            {...stylex.props(styles.tile)}
          >
            <TileContent
              icon={added ? UserRoundCheckIcon : UserRoundPlusIcon}
              label={t(added ? 'contacts.agent.added' : 'contacts.agent.add')}
            />
          </button>
        </div>
        <ContactInfo description={agent.description} slug={agent.slug} />
      </Flexbox>
    </>
  );
});

SharedAgentProfileCard.displayName = 'SharedAgentProfileCard';

const SharedAgentProfile = memo<{ share: string }>(({ share }) => {
  const { t } = useTranslation('common');
  const { error, revalidate } = contactActions.useFetchShare(share);
  const result = useContactStore(contactSelectors.sharedAgent(share));

  // One's own Agent opens its own card.
  if (result?.relation === 'self')
    return <Navigate replace to={CONTACT_URL(result.agent.agentId)} />;
  if (result) return <SharedAgentProfileCard result={result} />;

  if (result === null)
    return (
      <Flexbox align={'center'} flex={1} justify={'center'} {...stylex.props(styles.state)}>
        <Empty description={t('contacts.agent.unavailable')} icon={UserRoundXIcon} />
      </Flexbox>
    );
  if (error)
    return (
      <Flexbox align={'center'} flex={1} justify={'center'} {...stylex.props(styles.state)}>
        <AsyncError error={error} variant="inline" onRetry={() => void revalidate()} />
      </Flexbox>
    );
  return (
    <>
      <Skeleton height={COVER_HEIGHT} radius={12} width={'100%'} />
      <Flexbox align={'center'} gap={12} {...stylex.props(styles.body)}>
        <Skeleton.Avatar
          shape={'circle'}
          size={AVATAR_SIZE}
          style={{ marginBlockStart: -AVATAR_SIZE / 2 }}
        />
        <Skeleton height={28} width={160} />
      </Flexbox>
    </>
  );
});

SharedAgentProfile.displayName = 'SharedAgentProfile';

export { SharedAgentProfile };

/** `/agents/shared/:share`: a shared Agent's card in the content column of the Contacts tab. */
const SharedAgentProfilePage = () => {
  const { share } = useParams<{ share: string }>();

  return (
    <Flexbox flex={1} height={'100%'}>
      <NavHeader />
      <Flexbox
        align={'center'}
        flex={1}
        paddingInline={16}
        style={{ overflowY: 'auto', paddingBlockStart: 8 }}
      >
        {share && <SharedAgentProfile key={share} share={share} />}
      </Flexbox>
    </Flexbox>
  );
};

export default SharedAgentProfilePage;
