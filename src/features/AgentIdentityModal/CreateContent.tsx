'use client';

import { Button, Center, Flexbox, Icon, Text, toast, useModalContext } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { ChevronRightIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import EmojiPicker from '@/components/EmojiPicker';
import { ConnectAgentContent } from '@/features/ConnectAgent';
import { CONNECTABLE_PROVIDERS, type ConnectableProvider } from '@/features/ConnectAgent/providers';
import { useGlobalStore } from '@/store/global';
import { globalGeneralSelectors } from '@/store/global/selectors';

import BlindBoxAvatar from './BlindBoxAvatar';
import IdentityFields from './IdentityFields';
import {
  useCreateAgentIdentityForm,
  type UseCreateAgentIdentityFormOptions,
} from './useCreateAgentIdentityForm';

const styles = stylex.create({
  // The whole row is the entry to the runtime step, its description included.
  option: {
    cursor: 'pointer',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    width: '100%',
    fontFamily: 'inherit',
    color: 'inherit',
    textAlign: 'start',
    paddingBlock: '10px',
    paddingInline: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadius,
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorFillQuaternary },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
  },
  runtimes: {
    display: 'flex',
    flex: 'none',
    alignSelf: 'center',
    marginInlineStart: 'auto',
  },
  // Overlapping brand marks, each ringed in the surface color so the stack reads as separate icons.
  runtime: {
    display: 'flex',
    borderRadius: '50%',
    boxShadow: `0 0 0 2px ${cssVar.colorBgElevated}`,
    marginInlineStart: { 'default': '-6px', ':first-child': 0 },
  },
});

/** The third-party agents the option names by icon — the ones people know by sight. */
const FEATURED_RUNTIMES = ['claude-code', 'codex', 'openclaw', 'cursor', 'kimi-code'];
const featuredRuntimes = FEATURED_RUNTIMES.map((type) =>
  CONNECTABLE_PROVIDERS.find((provider) => provider.type === type),
).filter((provider): provider is ConnectableProvider => !!provider);

export type CreateAgentIdentityContentProps = UseCreateAgentIdentityFormOptions;

/**
 * Creating an agent is filling in who it is: avatar on top, then the same
 * identity fields the edit form has. Everything else (prompt, model, skills) is
 * configured on the profile page the new agent opens on.
 *
 * The third-party runtime entry (Claude Code, Codex…) leads to one more step
 * after the identity: picking the device and the agent that drives it. The identity
 * stays the user's; the runtime only fills a role or description left empty.
 */
const CreateAgentIdentityContent = memo<CreateAgentIdentityContentProps>(
  ({ groupId, onCreated, visibility }) => {
    const { t } = useTranslation(['setting', 'common']);
    const { close } = useModalContext();
    const locale = useGlobalStore(globalGeneralSelectors.currentLanguage);
    const [step, setStep] = useState<'identity' | 'runtime'>('identity');
    // The runtime step mounts on first visit and stays, so going back keeps its scan.
    const [runtimeVisited, setRuntimeVisited] = useState(false);
    // The avatar the agent picked in the runtime step brings, previewed above that step.
    const [pickedAvatar, setPickedAvatar] = useState<string>();
    const form = useCreateAgentIdentityForm({
      groupId,
      onCreated: (agentId) => {
        close();
        onCreated(agentId);
      },
      visibility,
    });

    const goRuntime = () => {
      setRuntimeVisited(true);
      setStep('runtime');
    };

    return (
      <>
        <Flexbox gap={20} hidden={step !== 'identity'} padding={20}>
          <Center>
            <EmojiPicker
              allowUpload
              allowDelete={!!form.avatar}
              loading={form.uploading}
              locale={locale}
              popupProps={{ placement: 'bottom' }}
              shape={'square'}
              size={72}
              value={form.avatar}
              // Same avatar the agent wears everywhere else. Without an emoji or
              // image it is the generated character — which the agent's future id
              // decides, so the preview cross-fades as a blind box rather than
              // promising one character.
              customRender={() =>
                form.avatar ? (
                  <AgentAvatar
                    avatar={form.avatar}
                    className={'lobe-emoji-picker-avatar'}
                    name={form.name}
                    size={72}
                  />
                ) : (
                  <BlindBoxAvatar
                    className={'lobe-emoji-picker-avatar'}
                    name={form.name}
                    size={72}
                  />
                )
              }
              onChange={(avatar) => form.setAvatar(avatar)}
              onDelete={() => form.setAvatar(undefined)}
              onUpload={async (file) => {
                if ((await form.uploadAvatar(file)) === 'tooLarge')
                  toast.error(t('settingAgent.avatar.sizeExceeded', { ns: 'setting' }));
              }}
            />
          </Center>
          <IdentityFields
            slugCollapsible
            form={form}
            slugPlaceholder={t('settingAgent.slug.autoPlaceholder', { ns: 'setting' })}
            advancedExtra={
              // An entry, not a setting: one click goes straight to picking the device
              // and the agent that drives this one. Folded with the slug, since most
              // agents are created without one.
              <button type={'button'} {...stylex.props(styles.option)} onClick={goRuntime}>
                <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
                  <Text>{t('settingAgent.identity.externalRuntime', { ns: 'setting' })}</Text>
                  <Text fontSize={12} type={'secondary'}>
                    {t('settingAgent.identity.externalRuntimeDesc', { ns: 'setting' })}
                  </Text>
                </Flexbox>
                <span aria-hidden {...stylex.props(styles.runtimes)}>
                  {featuredRuntimes.map((provider) => (
                    <span
                      key={provider.type}
                      title={provider.title}
                      {...stylex.props(styles.runtime)}
                    >
                      <provider.brand.Avatar size={22} />
                    </span>
                  ))}
                </span>
                <Icon
                  icon={ChevronRightIcon}
                  style={{ alignSelf: 'center', color: cssVar.colorTextTertiary }}
                />
              </button>
            }
          />
          <Flexbox horizontal gap={8} justify={'flex-end'}>
            <Button disabled={form.saving} onClick={() => close()}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              disabled={form.saving || form.uploading}
              loading={form.saving}
              type={'primary'}
              onClick={() => {
                void form.submit();
              }}
            >
              {t('settingAgent.identity.create', { ns: 'setting' })}
            </Button>
          </Flexbox>
        </Flexbox>
        {runtimeVisited && (
          <Flexbox hidden={step !== 'runtime'} paddingBlock={'0 12px'} paddingInline={20}>
            {/* The agent about to be created, with the avatar it will wear: its own, else the
                chosen runtime's mark, else the generated character. */}
            <Flexbox horizontal align={'center'} gap={12} paddingBlock={'16px 0'}>
              {form.avatar || pickedAvatar ? (
                <AgentAvatar avatar={form.avatar || pickedAvatar} name={form.name} size={40} />
              ) : (
                <BlindBoxAvatar name={form.name} size={40} />
              )}
              <Flexbox gap={2} style={{ minWidth: 0 }}>
                <Text ellipsis strong>
                  {form.name}
                </Text>
                {form.title && (
                  <Text ellipsis fontSize={12} type={'secondary'}>
                    {form.title}
                  </Text>
                )}
              </Flexbox>
            </Flexbox>
            <ConnectAgentContent
              groupId={groupId}
              pickLabel={t('settingAgent.identity.create', { ns: 'setting' })}
              visibility={visibility}
              onBack={() => setStep('identity')}
              onPickedAvatarChange={setPickedAvatar}
              onPick={async (runtime) => {
                // A rejected slug or a failed create is shown on the identity step.
                if (!(await form.submit(runtime))) setStep('identity');
              }}
            />
          </Flexbox>
        )}
      </>
    );
  },
);

export default CreateAgentIdentityContent;
