'use client';

import { Button, Center, Flexbox, toast, useModalContext } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import EmojiPicker from '@/components/EmojiPicker';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useGlobalStore } from '@/store/global';
import { globalGeneralSelectors } from '@/store/global/selectors';

import IdentityFields from './IdentityFields';
import { useAgentIdentityForm } from './useAgentIdentityForm';

const AVATAR_SIZE = 72;

interface AgentIdentityContentProps {
  agentId: string;
  /** Runs after everything is saved, before the modal closes. */
  onSaved?: () => void;
}

/**
 * The identity fields as a real form, the avatar on top as in the create form. They used to be
 * inline inputs in the profile header, which crowded it and left no room for a per-field label or
 * error. All behaviour lives in {@link useAgentIdentityForm}.
 */
const AgentIdentityContent = memo<AgentIdentityContentProps>(({ agentId, onSaved }) => {
  const { t } = useTranslation(['common', 'setting']);
  const { close } = useModalContext();
  const locale = useGlobalStore(globalGeneralSelectors.currentLanguage);
  const backgroundColor = useAgentStore(agentSelectors.getAgentMetaById(agentId)).backgroundColor;
  const form = useAgentIdentityForm({
    agentId,
    onSaved: () => {
      onSaved?.();
      close();
    },
  });

  return (
    <Flexbox gap={20} padding={20}>
      <Center>
        <EmojiPicker
          allowUpload
          allowDelete={!!form.avatar}
          loading={form.uploading}
          locale={locale}
          popupProps={{ placement: 'bottom' }}
          shape={'square'}
          size={AVATAR_SIZE}
          value={form.avatar}
          // Same avatar the agent wears everywhere else, its generated character when cleared.
          customRender={() => (
            <AgentAvatar
              agentId={agentId}
              avatar={form.avatar}
              background={backgroundColor || undefined}
              className={'lobe-emoji-picker-avatar'}
              name={form.name}
              size={AVATAR_SIZE}
            />
          )}
          onChange={(avatar) => form.setAvatar(avatar)}
          onDelete={() => form.setAvatar(undefined)}
          onUpload={async (file) => {
            if ((await form.uploadAvatar(file)) === 'tooLarge')
              toast.error(t('settingAgent.avatar.sizeExceeded', { ns: 'setting' }));
          }}
        />
      </Center>
      <IdentityFields agentId={agentId} form={form} />
      <Flexbox horizontal gap={8} justify={'flex-end'}>
        <Button disabled={form.saving} onClick={() => close()}>
          {t('cancel')}
        </Button>
        <Button
          disabled={form.saving || form.uploading}
          loading={form.saving}
          type={'primary'}
          onClick={() => {
            void form.save();
          }}
        >
          {t('save')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

export default AgentIdentityContent;
