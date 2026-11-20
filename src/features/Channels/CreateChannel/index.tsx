import {
  Button,
  createModal,
  Flexbox,
  Icon,
  Input,
  Switch,
  Text,
  toast,
  Tooltip,
  useModalContext,
} from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import { agentDisplayName, CHANNEL_LIMITS } from '@lobot/types';
import { t } from 'i18next';
import { Hash, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import AsyncError from '@/components/AsyncError';
import { type ChannelPersonOption, channelService } from '@/services/channel';
import { channelActions } from '@/store/channel';

import { confirmPublishPrivateAgents, ownPrivateAgentIds } from '../privateAgentJoin';
import type { ChannelAgentDraft } from './agentEnvironment';
import { canSubmitChannelMembers, toChannelAgentSelection } from './agentEnvironment';
import { defaultChannelTitle } from './channelTitle';
import { MemberSelection } from './MemberSelection';
import { usePersonName } from './PeopleOptions';
import { getChannelSaveErrorKey } from './saveError';
import { useChannelAgentOptions } from './useChannelAgentOptions';

interface ExistingChannel {
  /** Agents already in the Channel. */
  agentIds: string[];
  /**
   * Set for a direct conversation, which stays one person and one Agent: inviting starts a new
   * group with that Agent instead.
   */
  directAgentName?: string;
  id: string;
  /**
   * Set for a conversation between two people, which takes no third member: inviting starts a new
   * group with the other person instead.
   */
  peer?: { name: string; userId: string };
  /** Active people in the Channel, the inviter included. */
  peopleCount: number;
}

interface CreateChannelProps {
  /** Set when inviting members into a Channel that already exists. */
  existing?: ExistingChannel;
  onCreated?: (id: string) => void;
}

const openMemberDialog = (props: CreateChannelProps) =>
  createModal({
    content: <CreateChannel {...props} />,
    footer: null,
    // Longhands, not `padding: 0`: the modal's own paddingInline / paddingBlockEnd
    // would otherwise stay and inset the panes on the left, right, and bottom.
    styles: {
      content: {
        overflow: 'hidden',
        paddingBlockEnd: 0,
        paddingBlockStart: 0,
        paddingInline: 0,
      },
    },
    title: t(props.existing ? 'invite.title' : 'create', { ns: 'channel' }),
    width: 'min(90vw, 760px)',
  });

export const openCreateChannel = (onCreated?: (id: string) => void) =>
  openMemberDialog({ onCreated });

/** The single entry for adding people and Agents to an existing Channel. */
export const openInviteMembers = (existing: ExistingChannel, onCreated?: (id: string) => void) =>
  openMemberDialog({ existing, onCreated });

/**
 * One step, laid out like starting a group chat: candidates on the left, the chosen
 * members and the actions on the right. The name is optional and defaults to the members'
 * names. Inviting into an existing Channel shows only the pickers. It also lists the people
 * who can join: workspace members in a workspace, mutual contacts in the personal space.
 */
function CreateChannel({ existing, onCreated }: CreateChannelProps) {
  const { t } = useTranslation('channel');
  const { close, setCanDismissByClickOutside } = useModalContext();
  const [title, setTitle] = useState('');
  const [agents, setAgents] = useState<ChannelAgentDraft[]>([]);
  const [people, setPeople] = useState<ChannelPersonOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  // Like Discord, a new workspace Channel is open to the workspace unless made private.
  const [isPrivate, setIsPrivate] = useState(false);
  const options = useChannelAgentOptions();
  const direct = existing?.directAgentName !== undefined;
  const peer = existing?.peer;
  // A one-to-one conversation stays as it is: inviting from it starts a new group.
  const startsGroup = direct || !!peer;
  const counterpartName = direct ? existing?.directAgentName || t('unnamedAgent') : peer?.name;
  const nameOf = usePersonName();
  const activeWorkspaceId = useActiveWorkspaceId();
  const dirty = !!title.trim() || agents.length > 0 || people.length > 0;

  // A mask click must not drop what the user typed or picked; ✕ and Esc still close.
  useEffect(() => {
    setCanDismissByClickOutside(!dirty && !busy);
  }, [busy, dirty, setCanDismissByClickOutside]);

  const agentNames = agents.map(({ agentId }) =>
    agentDisplayName(
      options.agents?.find((agent) => agent.id === agentId),
      t('unnamedAgent'),
    ),
  );
  // A Channel with no one else in it yet still needs a name the sidebar can show.
  const autoTitle =
    defaultChannelTitle(
      counterpartName
        ? [counterpartName, ...agentNames, ...people.map(nameOf)]
        : [...agentNames, ...people.map(nameOf)],
      {
        more: (names, count, total) => t('autoTitle.more', { count, names, total }),
        separator: t('autoTitle.separator'),
      },
      CHANNEL_LIMITS.titleLength,
    ) || t('autoTitle.empty');
  const canSubmit = canSubmitChannelMembers(agents, {
    creating: !existing,
    people: people.length,
  });

  const submit = async () => {
    if (busy || !canSubmit) return;
    setBusy(true);
    setError(undefined);
    try {
      // Anyone besides the inviter would get no reply from a private Agent.
      const shared = people.length > 0 || (!direct && (existing?.peopleCount ?? 0) > 1);
      const privateIds = shared ? ownPrivateAgentIds(agents.map(({ agentId }) => agentId)) : [];
      try {
        await confirmPublishPrivateAgents(
          privateIds.map((id) => ({
            id,
            name: agentDisplayName(
              options.agents?.find((agent) => agent.id === id),
              t('unnamedAgent'),
            ),
          })),
        );
      } catch {
        // Declined, or publishing failed and said so: keep the picks for another try.
        return;
      }
      const selections = agents.map(toChannelAgentSelection);
      if (existing && direct) {
        const id = await channelActions.createGroupFromDirect({
          agents: selections,
          channelId: existing.id,
          title: title.trim() || autoTitle,
          userIds: people.map((person) => person.userId),
        });
        close();
        onCreated?.(id);
      } else if (existing && peer) {
        // The new group starts private with both people of the conversation in it.
        const id = await channelActions.create({
          agents: selections,
          title: title.trim() || autoTitle,
          userIds: [peer.userId, ...people.map((person) => person.userId)],
        });
        close();
        onCreated?.(id);
      } else if (existing) {
        await channelActions.addMembers(existing.id, {
          agents: selections,
          userIds: people.map((person) => person.userId),
        });
        close();
      } else {
        const id = await channelActions.create({
          agents: selections,
          title: title.trim() || autoTitle,
          userIds: people.map((person) => person.userId),
        });
        // Channels are created private; opening one to the workspace is a second write.
        if (activeWorkspaceId && !isPrivate) {
          await channelService.updateVisibility(id, 'public').catch((cause: unknown) => {
            console.error('Failed to make the new Channel public', cause);
            toast.warning(t('create.publicFailed'));
          });
        }
        close();
        onCreated?.(id);
      }
    } catch (cause) {
      console.error('Failed to save Channel members', cause);
      setError(cause);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MemberSelection
      exclude={existing?.agentIds}
      locked={busy}
      options={options}
      people={{ channelId: existing?.id, onChange: setPeople, value: people }}
      value={agents}
      footer={
        <Flexbox gap={12} padding={16}>
          {error !== undefined && (
            <AsyncError error={error} title={t(getChannelSaveErrorKey(error))} variant="inline" />
          )}
          <Flexbox horizontal align="center" gap={8} justify="space-between">
            <Flexbox horizontal align="center" gap={8}>
              {!existing && activeWorkspaceId && (
                <Tooltip title={t('create.privateHint')}>
                  <Flexbox horizontal align="center" gap={8} inert={busy}>
                    <Icon color={cssVar.colorTextSecondary} icon={Lock} size={14} />
                    <label htmlFor="channel-private">
                      <Text>{t('create.private')}</Text>
                    </label>
                    <Switch checked={isPrivate} id="channel-private" onChange={setIsPrivate} />
                  </Flexbox>
                </Tooltip>
              )}
              {agents.length > 0 && !canSubmit && (
                <Text fontSize={12} type="secondary">
                  {t('environment.resolveRequired')}
                </Text>
              )}
            </Flexbox>
            <Flexbox horizontal align="center" gap={8}>
              <Button disabled={busy} type="fill" onClick={close}>
                {t('cancel')}
              </Button>
              <Button
                disabled={!canSubmit}
                loading={busy}
                type="primary"
                onClick={() => void submit()}
              >
                {t(existing && !startsGroup ? 'invite.submit' : 'submit')}
              </Button>
            </Flexbox>
          </Flexbox>
        </Flexbox>
      }
      notice={
        !existing || startsGroup ? (
          <Input
            aria-label={t('nameOptional')}
            id="channel-title"
            inert={busy}
            maxLength={CHANNEL_LIMITS.titleLength}
            placeholder={autoTitle}
            prefix={<Icon icon={Hash} size={14} />}
            value={title}
            variant="filled"
            onChange={(event) => setTitle(event.target.value)}
            onPressEnter={() => void submit()}
          />
        ) : undefined
      }
      onChange={setAgents}
    />
  );
}
