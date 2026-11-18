'use client';

import { isDesktop } from '@lobechat/const';
import { RENDERER_HANDLED_LINK_ATTR } from '@lobechat/desktop-bridge';
import { ActionIcon, copyToClipboard, createStaticStyles, Icon, toast } from '@lobehub/ui';
import {
  BadgeCheckIcon,
  BotIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  TargetIcon,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useWorkspaces } from '@/business/client/hooks/useWorkspaces';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';
import { shouldHardNavigateToWorkbench } from '@/libs/next/workbenchNavigation';
import { useAgentStore } from '@/store/agent';
import {
  agentDocumentActions,
  agentDocumentSelectors,
  useAgentDocumentStore,
} from '@/store/agentDocument';
import { useChatStore } from '@/store/chat';
import { openTrustedExternalUrl } from '@/utils/openTrustedExternalUrl';

import { useEntityLinkHostDismiss, useEntityLinkPortal } from '../host';
import { type InternalLinkReference, isBareLinkLabel, isEntityIdLabel } from '../internalLink';
import { entityPreviewSelectors, useEntityPreviewStore, useFetchEntityPreview } from '../store';
import { InternalEntityPreview } from './InternalEntityPreview';
import { useAcceptanceBrowserUrl } from './useAcceptanceBrowserUrl';
import { useTaskLinkUrl } from './useTaskLinkUrl';

const styles = createStaticStyles(({ css, cssVar }) => ({
  action: css`
    margin-inline-start: 2px;
    color: ${cssVar.colorTextTertiary};
    vertical-align: middle;
    transition: color 0.15s;

    &:hover {
      color: ${cssVar.colorText};
    }
  `,
  icon: css`
    margin-inline-end: 4px;
    color: ${cssVar.colorTextSecondary};
    vertical-align: -0.15em;
  `,
  link: css`
    /* Keep the label on the surrounding text baseline instead of the icon's flex baseline. */
    display: inline;

    color: ${cssVar.colorText} !important;

    /* Tertiary, not colorBorder: on a dark background colorBorder sits so
       close to the bubble that the underline vanishes and the link reads as
       plain text — findability is the underline's whole job here. */
    text-decoration-color: ${cssVar.colorTextTertiary};
    text-decoration-line: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;

    transition:
      color 0.15s,
      text-decoration-color 0.15s;

    &:hover {
      color: ${cssVar.colorText} !important;
      text-decoration-color: ${cssVar.colorTextSecondary};
    }

    &:focus-visible {
      border-radius: 2px;
      outline: 2px solid ${cssVar.colorPrimaryBorder};
      outline-offset: 2px;
    }
  `,
  /* Inline, not inline-flex: a long title must keep wrapping with the
     sentence it sits in, the actions trailing its last line. */
  wrapper: css`
    display: inline;
  `,
}));

const ENTITY_ICONS = {
  acceptance: BadgeCheckIcon,
  agent: BotIcon,
  document: FileTextIcon,
  goal: TargetIcon,
  task: CheckSquareIcon,
  verify: CheckCircleIcon,
} as const;

interface InternalEntityLinkProps {
  href: string;
  label: string;
  reference: InternalLinkReference;
}

export const InternalEntityLink = memo<InternalEntityLinkProps>(({ href, label, reference }) => {
  const { i18n, t } = useTranslation('chat');
  const { t: tVerify } = useTranslation('verify');
  const { t: tPortal } = useTranslation('portal');
  const navigate = useWorkspaceAwareNavigate();
  const activeAgentId = useAgentStore((s) => s.activeAgentId);
  const portalAvailable = useEntityLinkPortal(reference.type);
  const dismissHost = useEntityLinkHostDismiss();
  const workspaces = useWorkspaces();
  const [
    openAcceptance,
    openAgentDetail,
    openDocument,
    openGoal,
    openTaskDetail,
    openVerifyReport,
  ] = useChatStore((s) => [
    s.openAcceptance,
    s.openAgentDetail,
    s.openDocument,
    s.openGoal,
    s.openTaskDetail,
    s.openVerifyReport,
  ]);
  // A pasted URL says nothing about what it points to, so resolve the entity's
  // own title and show that instead — the same read the hover preview makes,
  // under the same replica entry, so the eager fetch also makes the hover card instant.
  // Bare links are sparse in real messages, which is why prefetching the full
  // preview beats a dedicated title read. Cross-workspace links are skipped:
  // the ambient client resolves against the ACTIVE scope, where a
  // workspace-unique id like T-198 can name a different entity entirely.
  // Authored link text is never replaced; a failed read just leaves the URL.
  const shouldResolveTitle =
    reference.type !== 'route' &&
    !reference.workspaceSlug &&
    (isBareLinkLabel(label, href) || isEntityIdLabel(label, reference));
  const previewParams = useMemo(
    () => (shouldResolveTitle ? { locale: i18n.language, reference } : null),
    [i18n.language, reference, shouldResolveTitle],
  );
  useFetchEntityPreview(previewParams);
  const entity = useEntityPreviewStore(entityPreviewSelectors.preview(previewParams));
  const displayLabel = (shouldResolveTitle && entity?.title) || label;
  // The absolute report URL: a click on the link opens it in the system
  // browser, and the icon beside the link marks that it leaves the app. A
  // small icon right beside the link would be a mis-tap target on mobile, so
  // the icon stays off the mobile build.
  const isMobile = typeof __MOBILE__ !== 'undefined' && __MOBILE__;
  const acceptanceBrowserUrl = useAcceptanceBrowserUrl(reference);
  const browserUrl = isMobile ? undefined : acceptanceBrowserUrl;
  // A task is the entity most often handed on (to a teammate, an issue, a PR),
  // so its link carries a copy action beside it — the shareable web URL, not
  // whatever relative path the message happened to contain.
  const taskLinkUrl = useTaskLinkUrl(reference);
  const copyUrl = isMobile ? undefined : taskLinkUrl;

  const handleCopy = useCallback(async () => {
    if (!copyUrl) return;
    try {
      await copyToClipboard(copyUrl);
      toast.success(tPortal('moreMenu.copyLinkSuccess'));
    } catch {
      toast.error(t('copyFail', { ns: 'common' }));
    }
  }, [copyUrl, t, tPortal]);

  const linkedAgentId = reference.type === 'document' ? reference.agentId : undefined;
  const shouldResolveAgentDocument = !!linkedAgentId && linkedAgentId === activeAgentId;
  // Shares the agent's document-list replica with the documents panel, so the
  // row id is usually known (or persisted) before the click; a click that beats
  // the first sync resolves the list on demand.
  const resolvedAgentId = shouldResolveAgentDocument ? linkedAgentId : undefined;
  agentDocumentActions.useFetchDocumentList(resolvedAgentId);
  const agentDocuments = useAgentDocumentStore(
    agentDocumentSelectors.getDocumentList(resolvedAgentId),
  );

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0) return;

      // On the web a modifier-click means "open in a new tab", so let the browser
      // handle it. Desktop has no tabs: falling through would hand the OS an
      // `app://renderer/...` URL, which silently opens nothing.
      const modifierClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!isDesktop && modifierClick) return;

      event.preventDefault();

      // Lobot ships no acceptance view in its side panel: `openAcceptance`
      // would show the panel's empty workspace placeholder. Open the published
      // report in the system browser; only without an origin to build an
      // absolute URL from does the click fall through to the in-app paths.
      if (acceptanceBrowserUrl) {
        openTrustedExternalUrl(acceptanceBrowserUrl);
        return;
      }

      if (
        (reference.type === 'acceptance' ||
          reference.type === 'document' ||
          reference.type === 'verify') &&
        shouldHardNavigateToWorkbench(reference.pathname)
      ) {
        // A workspace-prefixed path is already scoped; an unprefixed one (or one
        // whose active slug was normalized away) is scoped like `navigate` does.
        window.location.assign(
          reference.workspaceSlug
            ? reference.pathname
            : buildWorkspaceAwarePath(reference.pathname, getActiveWorkspaceSlug()),
        );
        return;
      }

      // A task in another workspace still opens beside the conversation: the
      // panel reads it through that workspace's scope (read-only) instead of
      // switching the whole page into it.
      if (reference.type === 'task' && reference.workspaceSlug && portalAvailable) {
        const workspace = workspaces.find((item) => item.slug === reference.workspaceSlug);
        if (workspace) {
          openTaskDetail(reference.taskId, { id: workspace.id, slug: workspace.slug });
          return;
        }
      }

      // Portal-backed entities (verify / acceptance) open in-context regardless
      // of workspace scope — their reads are id-addressed and scope-independent.
      if (
        'workspaceSlug' in reference &&
        reference.workspaceSlug &&
        reference.type !== 'verify' &&
        reference.type !== 'acceptance'
      ) {
        navigate(reference.pathname, { escape: true });
        return;
      }

      if (
        reference.type === 'document' &&
        reference.agentId &&
        reference.agentId !== activeAgentId
      ) {
        navigate(reference.pathname, { escape: true });
        return;
      }

      // The mobile portal is a modal over the chat, too cramped to read or edit
      // a page in — open the standalone page route instead, so back returns here.
      if (reference.type === 'document' && typeof __MOBILE__ !== 'undefined' && __MOBILE__) {
        navigate(reference.pathname);
        return;
      }

      // A surface with no portal panel cannot show the detail beside its
      // content: `open*` would set state nothing renders, leaving a click that
      // does nothing. The entity's own route is the destination that works
      // there — never a new browser tab for our own content.
      if (!portalAvailable) {
        // Electron registers no standalone acceptance route, so navigating
        // there lands on a dead destination. An overlay over a portal-capable
        // page can close and let that page's panel show the report instead.
        if (isDesktop && reference.type === 'acceptance' && dismissHost) {
          dismissHost();
          openAcceptance(reference.acceptanceId);
          return;
        }
        navigate(reference.pathname);
        return;
      }

      switch (reference.type) {
        case 'acceptance': {
          // The conversation is the working surface — the acceptance opens
          // beside it in the portal, same as a verify report, never a
          // full-page navigation away from the chat.
          openAcceptance(reference.acceptanceId);
          break;
        }
        case 'agent': {
          openAgentDetail(reference.agentId);
          break;
        }
        case 'goal': {
          openGoal(reference.goalId);
          break;
        }
        case 'document': {
          const documents = shouldResolveAgentDocument
            ? (agentDocuments ??
              (await agentDocumentActions.fetchDocumentList(linkedAgentId!).catch(() => undefined)))
            : undefined;
          const agentDocumentId = documents?.find(
            (document) => document.documentId === reference.documentId,
          )?.id;

          openDocument(reference.documentId, agentDocumentId);
          break;
        }
        case 'task': {
          openTaskDetail(reference.taskId);
          break;
        }
        case 'verify': {
          openVerifyReport(reference.runId);
          break;
        }
        case 'route': {
          navigate(reference.pathname);
          break;
        }
      }
    },
    [
      acceptanceBrowserUrl,
      activeAgentId,
      agentDocuments,
      dismissHost,
      navigate,
      openAcceptance,
      openAgentDetail,
      openDocument,
      openGoal,
      openTaskDetail,
      openVerifyReport,
      portalAvailable,
      reference,
      linkedAgentId,
      shouldResolveAgentDocument,
      workspaces,
    ],
  );

  const icon = reference.type === 'route' ? undefined : ENTITY_ICONS[reference.type];

  const link = (
    <a
      {...{ [RENDERER_HANDLED_LINK_ATTR]: 'true' }}
      className={styles.link}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      onClick={handleClick}
    >
      {icon && <Icon className={styles.icon} icon={icon} size={14} />}
      {displayLabel}
    </a>
  );

  const preview =
    reference.type === 'route' || reference.workspaceSlug ? (
      link
    ) : (
      <InternalEntityPreview fallbackTitle={displayLabel} reference={reference}>
        {link}
      </InternalEntityPreview>
    );

  if (!browserUrl && !copyUrl) return preview;

  return (
    <span className={styles.wrapper}>
      {preview}
      {/* Outside the anchor, like the side-browser action: the desktop preload
          claims clicks via `closest('a')`, so a nested button would never fire. */}
      {browserUrl && (
        <ActionIcon
          data-acceptance-browser
          aria-label={tVerify('report.actions.openInBrowser')}
          className={styles.action}
          icon={ExternalLinkIcon}
          size={'small'}
          title={tVerify('report.actions.openInBrowser')}
          onClick={() => openTrustedExternalUrl(browserUrl)}
        />
      )}
      {copyUrl && (
        <ActionIcon
          data-task-link-copy
          aria-label={tPortal('moreMenu.copyLink')}
          className={styles.action}
          icon={CopyIcon}
          size={'small'}
          title={tPortal('moreMenu.copyLink')}
          onClick={handleCopy}
        />
      )}
    </span>
  );
});

InternalEntityLink.displayName = 'InternalEntityLink';
