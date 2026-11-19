import {
  Button,
  createModal,
  Flexbox,
  RadioGroup,
  Text,
  toast,
  useModalContext,
} from '@lobehub/ui';
import type { ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { t } from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AsyncBoundary from '@/components/AsyncBoundary';
import AsyncError from '@/components/AsyncError';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useDeviceList } from '@/store/device/useDeviceList';

import type { ChannelAgentDraft } from './CreateChannel/agentEnvironment';
import { EnvironmentFields, EnvironmentIssue } from './CreateChannel/EnvironmentFields';
import { useChannelAgentDraft } from './CreateChannel/useChannelAgentDraft';
import { MemberAvatar } from './MemberAvatar';
import { memberName } from './memberName';
import { OwnEnvironmentSummary } from './OwnEnvironmentSummary';

interface Environment {
  agentId: string;
  deviceId?: string;
  workingDirectory?: string;
}

/** `agent`: the Agent's own settings decide; `channel`: a device picked for this Channel. */
type Mode = 'agent' | 'channel';

const styles = stylex.create({
  // Lines the fields up with the option text, past the radio dot and its gap.
  fields: { minWidth: 0, overflow: 'visible', paddingInlineStart: 24 },
});

function EnvironmentForm({
  channelId,
  current,
  member,
}: {
  channelId: string;
  current: Environment;
  member: ChannelPublicMember;
}) {
  const { t } = useTranslation(['channel', 'common']);
  const { close } = useModalContext();
  // The saved channel choice is the starting point, not the Agent's own defaults.
  const [drafts, setDrafts] = useState<ChannelAgentDraft[]>(() => [
    { ...current, initialized: true },
  ]);
  const devices = useDeviceList({ refreshInterval: 15_000 });
  const controls = useChannelAgentDraft(drafts[0], devices, setDrafts);
  const { change, changeDevice, draft } = controls;
  const [mode, setMode] = useState<Mode>(current.deviceId ? 'channel' : 'agent');
  // Switching back to the Agent's settings and then to this Channel again restores the pick.
  const lastPick = useRef<Pick<Environment, 'deviceId' | 'workingDirectory'>>({
    deviceId: current.deviceId,
    workingDirectory: current.workingDirectory,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const name = memberName(member, t('unnamedAgent'));
  const changed =
    (draft.deviceId ?? '') !== (current.deviceId ?? '') ||
    (draft.workingDirectory ?? '') !== (current.workingDirectory ?? '');
  // Choosing "this Channel" without a device yet saves nothing: there is nothing to save.
  const canSave = changed && !draft.issue && (mode === 'agent' || !!draft.deviceId);

  const switchMode = (next: string) => {
    if (next === mode) return;
    if (next === 'agent') {
      lastPick.current = { deviceId: draft.deviceId, workingDirectory: draft.workingDirectory };
      changeDevice(undefined);
      setMode('agent');
      return;
    }
    setMode('channel');
    const { deviceId, workingDirectory } = lastPick.current;
    if (!deviceId) return;
    change({ deviceId });
    if (workingDirectory) change({ workingDirectory });
  };

  const save = async () => {
    if (busy || !canSave) return;
    setBusy(true);
    setError(undefined);
    try {
      await channelActions.updateAgentEnvironment(channelId, member.id, {
        deviceId: draft.deviceId,
        workingDirectory: draft.workingDirectory,
      });
      toast.success(t('environment.saved'));
      close();
    } catch (cause) {
      console.error('Failed to update Channel member environment', cause);
      setError(cause);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flexbox gap={16} style={{ minWidth: 0, overflow: 'visible' }}>
      <Text fontSize={13} type="secondary">
        {t('environment.scopeHint', { name })}
      </Text>
      <Flexbox gap={12} inert={busy} style={{ minWidth: 0, overflow: 'visible' }}>
        <RadioGroup
          aria-label={t('environment.editNamed', { name })}
          gap={16}
          horizontal={false}
          value={mode}
          options={[
            {
              label: (
                <Flexbox gap={2}>
                  <Text weight={500}>{t('environment.mode.agent', { name })}</Text>
                  <OwnEnvironmentSummary agentId={current.agentId} name={name} />
                </Flexbox>
              ),
              value: 'agent',
            },
            {
              label: (
                <Flexbox gap={2}>
                  <Text weight={500}>{t('environment.mode.channel')}</Text>
                  {mode === 'agent' && (
                    <Text fontSize={13} type="secondary">
                      {t('environment.mode.channelDesc')}
                    </Text>
                  )}
                </Flexbox>
              ),
              value: 'channel',
            },
          ]}
          onChange={switchMode}
        />
        {mode === 'channel' && (
          <Flexbox gap={8} {...stylex.props(styles.fields)}>
            <EnvironmentFields controls={controls} devices={devices} name={name} />
            <EnvironmentIssue controls={controls} />
          </Flexbox>
        )}
      </Flexbox>
      {error !== undefined && (
        <AsyncError error={error} title={t('environment.updateFailed')} variant="inline" />
      )}
      <Flexbox horizontal gap={8} justify="flex-end">
        <Button disabled={busy} onClick={close}>
          {t('cancel', { ns: 'common' })}
        </Button>
        <Button disabled={!canSave} loading={busy} type="primary" onClick={() => void save()}>
          {t('save', { ns: 'common' })}
        </Button>
      </Flexbox>
    </Flexbox>
  );
}

function AgentEnvironment({
  channelId,
  member,
}: {
  channelId: string;
  member: ChannelPublicMember;
}) {
  const { error, revalidate } = channelActions.useFetchAgentEnvironment(channelId, member.id);
  const data = useChannelStore(
    channelSelectors.agentEnvironment({ channelId, memberId: member.id }),
  );
  return (
    <AsyncBoundary
      data={data}
      error={error}
      isLoading={data === undefined && !error}
      onRetry={() => void revalidate()}
    >
      {data && (
        // The form copies the saved choice once; a refetch that changes it starts the form over.
        <EnvironmentForm
          channelId={channelId}
          current={data}
          key={`${data.deviceId ?? ''}:${data.workingDirectory ?? ''}`}
          member={member}
        />
      )}
    </AsyncBoundary>
  );
}

/** Where one Agent runs in this Channel; its own Agent settings stay unchanged. */
export const openChannelAgentEnvironment = (channelId: string, member: ChannelPublicMember) => {
  const name = memberName(member, t('unnamedAgent', { ns: 'channel' }));
  return createModal({
    content: <AgentEnvironment channelId={channelId} member={member} />,
    footer: null,
    title: (
      <Flexbox horizontal align="center" gap={8} style={{ minWidth: 0 }}>
        <MemberAvatar member={member} size={24} />
        <Text ellipsis fontSize={16} weight={600}>
          {t('environment.titleNamed', { name, ns: 'channel' })}
        </Text>
      </Flexbox>
    ),
    width: 'min(90vw, 480px)',
  });
};
