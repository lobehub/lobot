import { agentDisplayName, CHANNEL_LIMITS } from '@lobot/types';
import {
  Button,
  createModal,
  cssVar,
  Flexbox,
  Icon,
  Input,
  Switch,
  Text,
  toast,
  useModalContext,
} from '@lobehub/ui';
import { t } from 'i18next';
import { Hash, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import AsyncError from '@/components/AsyncError';
import { type ChannelPersonOption, channelService } from '@/services/channel';
import { channelActions } from '@/store/channel';
import { type ProjectListItem, useProjectStore } from '@/store/project';

import { confirmPublishPrivateAgents, ownPrivateAgentIds } from '../privateAgentJoin';
import type { ChannelAgentDraft } from './agentEnvironment';
import { canSubmitChannelMembers, toChannelAgentSelection } from './agentEnvironment';
import { defaultChannelTitle } from './channelTitle';
import { MemberSelection } from './MemberSelection';
import { NewProjectPanel } from './NewProjectPanel';
import { usePersonName } from './PeopleOptions';
import { getChannelSaveErrorKey } from './saveError';
import { type ChannelKind, ScopeField, useChannelKindsEnabled } from './ScopeField';
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
  /** People can be invited only into workspace Channels. */
  workspaceId: string | null;
}

type Step = 'basics' | 'members';
/** The basics step widens into two columns while a new project is filled in beside it. */
type Layout = Step | 'basicsWithProject';

interface CreateChannelProps {
  /** Set when inviting members into a Channel that already exists. */
  existing?: ExistingChannel;
  onCreated?: (id: string) => void;
  /** Resizes the dialog to what is being shown. */
  onLayoutChange?: (layout: Layout) => void;
  /** A new Channel created from a project's sidebar starts out as that project's. */
  projectId?: string;
}

/** The basics are a short form; only the member pickers need the room of two columns. */
const LAYOUT_WIDTH: Record<Layout, string> = {
  basics: 'min(90vw, 480px)',
  basicsWithProject: 'min(90vw, 800px)',
  members: 'min(90vw, 800px)',
};

const openMemberDialog = (props: Omit<CreateChannelProps, 'onLayoutChange'>) => {
  const resize: { current?: (layout: Layout) => void } = {};
  const modal = createModal({
    content: <CreateChannel {...props} onLayoutChange={(layout) => resize.current?.(layout)} />,
    footer: null,
    title: t(props.existing ? 'invite.title' : 'create', { ns: 'channel' }),
    width: LAYOUT_WIDTH[props.existing ? 'members' : 'basics'],
  });
  resize.current = (layout) => modal.update({ width: LAYOUT_WIDTH[layout] });
  return modal;
};

export const openCreateChannel = (onCreated?: (id: string) => void, projectId?: string) =>
  openMemberDialog({ onCreated, projectId });

/** The single entry for adding people and Agents to an existing Channel. */
export const openInviteMembers = (existing: ExistingChannel, onCreated?: (id: string) => void) =>
  openMemberDialog({ existing, onCreated });

/**
 * Creating asks what the Channel is first, like Discord: its kind (general or a project's), its
 * name and whether it is private; members come in a second step. The name is optional and
 * defaults to the members' names. Inviting into an existing Channel is only the member step.
 * Workspace Channels, new or existing, also list workspace members.
 *
 * A project Channel can also start a new project: the dialog opens the project beside the
 * Channel, both are created on submit, and the Channel takes the project's name.
 */
function CreateChannel({ existing, onCreated, onLayoutChange, projectId }: CreateChannelProps) {
  const { t } = useTranslation('channel');
  const { close, setCanDismissByClickOutside } = useModalContext();
  const [title, setTitle] = useState('');
  const [agents, setAgents] = useState<ChannelAgentDraft[]>([]);
  const [people, setPeople] = useState<ChannelPersonOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  // A new Channel is general or a project's; the project, if any, is changeable until created.
  const [scopeProjectId, setScopeProjectId] = useState<string | null>(projectId ?? null);
  const kindsEnabled = useChannelKindsEnabled();
  const [kind, setKind] = useState<ChannelKind>(projectId ? 'project' : 'general');
  const [step, setStep] = useState<Step>(existing ? 'members' : 'basics');
  // The name of a project created together with the Channel; `undefined` when none is.
  const [newProjectName, setNewProjectName] = useState<string>();
  // Kept across a failed submit, so retrying does not create the project twice.
  const createdProject = useRef<ProjectListItem>(undefined);
  const creatingProject = newProjectName !== undefined;
  const layout: Layout = step === 'basics' && creatingProject ? 'basicsWithProject' : step;
  // The dialog opens at the first layout's width; only a change resizes it.
  const shownLayout = useRef(layout);
  useEffect(() => {
    if (shownLayout.current === layout) return;
    shownLayout.current = layout;
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);
  // Like Discord, a new workspace Channel is open to the workspace unless made private.
  const [isPrivate, setIsPrivate] = useState(false);
  const projectChannel = kindsEnabled && kind === 'project';
  const newProject = projectChannel && creatingProject;
  const projectPicked = newProject ? !!newProjectName?.trim() : !!scopeProjectId;
  const options = useChannelAgentOptions(
    existing || !projectChannel || newProject ? undefined : (scopeProjectId ?? undefined),
  );
  const direct = existing?.directAgentName !== undefined;
  const peer = existing?.peer;
  // A one-to-one conversation stays as it is: inviting from it starts a new group.
  const startsGroup = direct || !!peer;
  const counterpartName = direct ? existing?.directAgentName || t('unnamedAgent') : peer?.name;
  const nameOf = usePersonName();
  const activeWorkspaceId = useActiveWorkspaceId();
  // People join only workspace Channels: a new one is created in the active workspace.
  const canPickPeople = existing ? !!existing.workspaceId : !!activeWorkspaceId;
  const dirty =
    !!title.trim() || !!newProjectName?.trim() || agents.length > 0 || people.length > 0;

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
        let channelProjectId = projectChannel ? (scopeProjectId ?? undefined) : undefined;
        let channelTitle = title.trim() || autoTitle;
        if (newProject && newProjectName !== undefined) {
          const name = newProjectName.trim();
          createdProject.current ??= await useProjectStore.getState().createProject({ name });
          channelProjectId = createdProject.current.id;
          channelTitle = name.slice(0, CHANNEL_LIMITS.titleLength);
        }
        const id = await channelActions.create({
          agents: selections,
          // Agents picked from outside the project join it along with the Channel.
          joinProject: true,
          projectId: channelProjectId,
          title: channelTitle,
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

  const goToMembers = () => {
    if (projectChannel && !projectPicked) return;
    setStep('members');
  };

  if (step === 'basics') {
    const channelFields = (
      <Flexbox gap={20} style={{ flex: 1, minWidth: 0 }}>
        {kindsEnabled && (
          <ScopeField
            kind={kind}
            newProjectName={newProject ? newProjectName : undefined}
            projectId={scopeProjectId}
            onCreateProject={(name) => {
              setNewProjectName(name);
              setScopeProjectId(null);
            }}
            onKindChange={(next) => {
              setKind(next);
              if (next === 'general') setNewProjectName(undefined);
            }}
            onProjectChange={(id) => {
              setScopeProjectId(id);
              setNewProjectName(undefined);
              // "No project" in the picker is the general kind.
              if (!id) setKind('general');
            }}
          />
        )}
        {/* A Channel created with its project is named after the project. */}
        {!newProject && (
          <Flexbox gap={6}>
            <label htmlFor="channel-title" style={{ fontWeight: 500 }}>
              {t('nameOptional')}
            </label>
            <Input
              autoFocus
              id="channel-title"
              maxLength={CHANNEL_LIMITS.titleLength}
              placeholder={t('create.namePlaceholder')}
              prefix={<Icon icon={Hash} size={14} />}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onPressEnter={goToMembers}
            />
          </Flexbox>
        )}
        {activeWorkspaceId && (
          <Flexbox horizontal align={'center'} gap={16} justify={'space-between'}>
            <Flexbox gap={2}>
              <Flexbox horizontal align={'center'} gap={6}>
                <Icon icon={Lock} size={14} />
                <Text weight={500}>{t('create.private')}</Text>
              </Flexbox>
              <Text fontSize={12} type={'secondary'}>
                {t('create.privateHint')}
              </Text>
            </Flexbox>
            <Switch checked={isPrivate} onChange={setIsPrivate} />
          </Flexbox>
        )}
      </Flexbox>
    );

    return (
      <Flexbox gap={20}>
        {newProject ? (
          <Flexbox horizontal gap={24} style={{ flexWrap: 'wrap' }}>
            {channelFields}
            <Flexbox
              style={{
                borderInlineStart: `1px solid ${cssVar.colorBorderSecondary}`,
                flex: 1,
                minWidth: 260,
                paddingInlineStart: 24,
              }}
            >
              <NewProjectPanel
                name={newProjectName ?? ''}
                onClose={() => setNewProjectName(undefined)}
                onNameChange={setNewProjectName}
                onPressEnter={goToMembers}
              />
            </Flexbox>
          </Flexbox>
        ) : (
          channelFields
        )}
        <Flexbox horizontal align="center" gap={8} justify="flex-end">
          <Button onClick={close}>{t('cancel')}</Button>
          <Button disabled={projectChannel && !projectPicked} type="primary" onClick={goToMembers}>
            {t('create.next')}
          </Button>
        </Flexbox>
      </Flexbox>
    );
  }

  return (
    <Flexbox gap={16}>
      {startsGroup && (
        <Text fontSize={12} type="secondary">
          {t('invite.directHint', { name: counterpartName })}
        </Text>
      )}
      <Flexbox gap={8} inert={busy}>
        <MemberSelection
          emptyHint={existing ? undefined : t('create.onlyYou')}
          exclude={existing?.agentIds}
          options={options}
          value={agents}
          people={
            canPickPeople
              ? { channelId: existing?.id, onChange: setPeople, value: people }
              : undefined
          }
          onChange={setAgents}
        />
      </Flexbox>
      {startsGroup && (
        <Flexbox gap={6} inert={busy}>
          <label htmlFor="channel-title" style={{ fontWeight: 500 }}>
            {t('nameOptional')}
          </label>
          <Input
            id="channel-title"
            maxLength={CHANNEL_LIMITS.titleLength}
            placeholder={autoTitle}
            prefix={<Icon icon={Hash} size={14} />}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onPressEnter={() => void submit()}
          />
        </Flexbox>
      )}
      {error !== undefined && (
        <AsyncError error={error} title={t(getChannelSaveErrorKey(error))} variant="inline" />
      )}
      <Flexbox horizontal align="center" gap={8} justify="flex-end">
        {agents.length > 0 && !canSubmit && (
          <Text fontSize={12} type="secondary">
            {t('environment.resolveRequired')}
          </Text>
        )}
        {existing ? (
          <Button disabled={busy} onClick={close}>
            {t('cancel')}
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => setStep('basics')}>
            {t('create.back')}
          </Button>
        )}
        <Button disabled={!canSubmit} loading={busy} type="primary" onClick={() => void submit()}>
          {t(
            existing && !startsGroup
              ? 'invite.submit'
              : newProject
                ? 'newProject.submit'
                : 'submit',
          )}
        </Button>
      </Flexbox>
    </Flexbox>
  );
}
