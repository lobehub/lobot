'use client';

import { Button, createModal, Flexbox, Input, Text, useModalContext } from '@lobehub/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSwitchWorkspace } from '@/business/client/hooks/useSwitchWorkspace';
import { refreshWorkspaces } from '@/business/client/workspace/list';
import { workspaceService } from '@/business/client/workspace/service';
import { workspaceSlugFromName } from '@/business/client/workspace/slug';
import AsyncError from '@/components/AsyncError';

const NAME_MAX = 255;

/** The server's creation caps arrive as `<CODE>:<limit>` in the error message. */
export const workspaceLimitError = (
  error: unknown,
): { code: 'free' | 'total'; limit: number } | undefined => {
  const message = (error as { message?: string } | undefined)?.message ?? '';
  const match = message.match(/(FREE_WORKSPACE_LIMIT_REACHED|WORKSPACE_TOTAL_LIMIT_REACHED):(\d+)/);
  if (!match) return;
  return { code: match[1].startsWith('FREE') ? 'free' : 'total', limit: Number(match[2]) };
};

interface CreateWorkspaceProps {
  onCreated: (id: string) => void;
}

/** Name it and go, like adding a Discord server; members and settings come later. */
const CreateWorkspace = ({ onCreated }: CreateWorkspaceProps) => {
  const { t } = useTranslation('common');
  const { close, setCanDismissByClickOutside } = useModalContext();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const trimmed = name.trim();
  const limit = workspaceLimitError(error);

  // A mask click must not drop what the user typed; ✕ and Esc still close.
  useEffect(() => {
    setCanDismissByClickOutside(!trimmed && !busy);
  }, [busy, setCanDismissByClickOutside, trimmed]);

  const submit = async () => {
    if (busy || !trimmed) return;
    setBusy(true);
    setError(undefined);
    try {
      const workspace = await workspaceService.create({
        name: trimmed,
        slug: workspaceSlugFromName(trimmed),
      });
      await refreshWorkspaces();
      close();
      onCreated(workspace.id);
    } catch (cause) {
      console.error('Failed to create workspace', cause);
      setError(cause);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flexbox gap={16} paddingBlock={'8px 0'}>
      <Text type={'secondary'}>{t('workspaceRail.createModal.desc')}</Text>
      <Input
        autoFocus
        aria-label={t('workspaceRail.createModal.name')}
        maxLength={NAME_MAX}
        placeholder={t('workspaceRail.createModal.namePlaceholder')}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onPressEnter={() => void submit()}
      />
      {limit ? (
        <Text type={'danger'}>
          {t(
            limit.code === 'free'
              ? 'workspaceRail.createModal.freeLimit'
              : 'workspaceRail.createModal.totalLimit',
            { count: limit.limit },
          )}
        </Text>
      ) : (
        !!error && <AsyncError error={error} variant="inline" onRetry={() => void submit()} />
      )}
      <Flexbox horizontal gap={8} justify={'flex-end'}>
        <Button disabled={busy} onClick={close}>
          {t('cancel')}
        </Button>
        <Button disabled={!trimmed} loading={busy} type={'primary'} onClick={() => void submit()}>
          {t('workspaceRail.createModal.submit')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
};

export const openCreateWorkspace = (onCreated: (id: string) => void) =>
  createModal({
    content: <CreateWorkspace onCreated={onCreated} />,
    footer: null,
    title: t('workspaceRail.createModal.title', { ns: 'common' }),
    width: 'min(90vw, 440px)',
  });

/** Switches into the workspace just created; the rail's own switch does the same. */
export const useOpenCreateWorkspace = (afterSwitch: () => void) => {
  const { switchWorkspace } = useSwitchWorkspace();
  return () =>
    openCreateWorkspace(async (id) => {
      await switchWorkspace(id);
      afterSwitch();
    });
};
