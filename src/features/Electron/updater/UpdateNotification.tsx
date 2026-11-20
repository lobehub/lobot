import type { UpdateInfo, UpdaterState } from '@lobechat/electron-client-ipc';
import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import {
  Button as BaseButton,
  createModal,
  Flexbox,
  Icon,
  Markdown,
  toast,
  useModalContext,
} from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { t } from 'i18next';
import { Loader2, RefreshCw, X } from 'lucide-react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { autoUpdateService } from '@/services/electron/autoUpdate';
import { rendererOtaService } from '@/services/electron/rendererOta';

import { applyCoreUpdate } from './applyCoreUpdate';
import { formatCoreVersion } from './coreVersion';
import { selectUpdateInfo } from './selectUpdateInfo';
import { formatUpdatePercent, selectUpdateIsland } from './selectUpdateIsland';
import { useAutoDismiss } from './useAutoDismiss';

const APPLIED_TOAST_DURATION = 3000;

const spin = stylex.keyframes({
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  // Same fill and stroke as the outlined contacts ActionIcon in this column.
  island: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxSizing: 'border-box',
    marginBlockStart: '4px',
    marginBlockEnd: '8px',
    marginInline: '12px',
    paddingBlock: '6px',
    paddingInlineStart: '12px',
    paddingInlineEnd: '6px',
    borderColor: cssVar.colorBorder,
    fontSize: '13px',
    lineHeight: '18px',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    backgroundColor: cssVar.colorBgElevated,
  },
  status: {
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    color: 'inherit',
    font: 'inherit',
    fontWeight: 600,
    textAlign: 'start',
    textOverflow: 'ellipsis',
  },
  statusButton: {
    cursor: 'pointer',
    outlineWidth: { 'default': 0, ':focus-visible': '2px' },
    outlineStyle: { 'default': 'none', ':focus-visible': 'solid' },
    outlineColor: { 'default': 'transparent', ':focus-visible': cssVar.colorPrimary },
    outlineOffset: '2px',
  },
  action: {
    cursor: { 'default': 'pointer', ':disabled': 'progress' },
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    boxSizing: 'border-box',
    height: '26px',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: '10px',
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '8px',
    boxShadow: `0 1px 2px color-mix(in srgb, ${cssVar.colorText} 12%, transparent)`,
    font: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    opacity: { 'default': 1, ':disabled': 1 },
    outlineWidth: { 'default': 0, ':focus-visible': '2px' },
    outlineStyle: { 'default': 'none', ':focus-visible': 'solid' },
    outlineColor: { 'default': 'transparent', ':focus-visible': cssVar.colorPrimary },
    outlineOffset: '2px',
    transform: {
      'default': 'scale(1)',
      ':active': 'scale(0.96)',
      ':disabled': 'scale(1)',
      '@media (prefers-reduced-motion: reduce)': 'scale(1)',
    },
    color: cssVar.colorBgContainer,
    backgroundColor: {
      'default': cssVar.colorText,
      ':hover': cssVar.colorText,
      ':disabled': cssVar.colorText,
    },
    backgroundImage: 'none',
  },
  progressAction: {
    minWidth: '64px',
    cursor: 'progress',
  },
  close: {
    cursor: 'pointer',
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '8px',
    backgroundColor: { 'default': cssVar.colorText, ':hover': cssVar.colorText },
    backgroundImage: 'none',
    color: cssVar.colorBgContainer,
    outlineWidth: { 'default': 0, ':focus-visible': '2px' },
    outlineStyle: { 'default': 'none', ':focus-visible': 'solid' },
    outlineColor: { 'default': 'transparent', ':focus-visible': cssVar.colorPrimary },
    outlineOffset: '2px',
  },
  spin: {
    display: 'inline-flex',
    animationName: { 'default': spin, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: { 'default': '0.8s', '@media (prefers-reduced-motion: reduce)': '0s' },
    animationTimingFunction: {
      'default': 'linear',
      '@media (prefers-reduced-motion: reduce)': 'linear',
    },
    animationIterationCount: {
      'default': 'infinite',
      '@media (prefers-reduced-motion: reduce)': 1,
    },
  },
  releaseNote: {
    overflow: 'auto',
    maxHeight: '300px',
    paddingBlock: '8px',
    paddingInline: '8px',
    borderRadius: '8px',
    backgroundColor: cssVar.colorFillQuaternary,
    backgroundImage: 'none',
  },
});

interface UpdateDetailContentProps {
  updateInfo: UpdateInfo;
}

const UpdateDetailContent = memo<UpdateDetailContentProps>(({ updateInfo }) => {
  const { t: tElectron } = useTranslation('electron');
  const { close } = useModalContext();
  const [isInstalling, setIsInstalling] = useState(false);

  return (
    <Flexbox gap={12} style={{ maxWidth: 480 }}>
      <div style={{ color: cssVar.colorTextSecondary, fontSize: 12 }}>{updateInfo.version}</div>
      {updateInfo.releaseNotes &&
        (typeof updateInfo.releaseNotes === 'string' ? (
          <div {...stylex.props(styles.releaseNote)}>
            <Markdown>{updateInfo.releaseNotes}</Markdown>
          </div>
        ) : (
          <div {...stylex.props(styles.releaseNote)}>
            {updateInfo.releaseNotes.map((note) => (
              <Markdown key={note.version}>{note.note ?? ''}</Markdown>
            ))}
          </div>
        ))}
      <Flexbox horizontal gap={8} justify={'flex-end'}>
        <BaseButton
          onClick={() => {
            autoUpdateService.installLater();
            close();
          }}
        >
          {tElectron('updater.installLater')}
        </BaseButton>
        <BaseButton
          loading={isInstalling}
          type={'primary'}
          onClick={() => {
            setIsInstalling(true);
            autoUpdateService.installNow();
          }}
        >
          {tElectron('updater.restartAndInstall')}
        </BaseButton>
      </Flexbox>
    </Flexbox>
  );
});

UpdateDetailContent.displayName = 'UpdateDetailContent';

const openUpdateDetailModal = (updateInfo: UpdateInfo) =>
  createModal({
    content: <UpdateDetailContent updateInfo={updateInfo} />,
    footer: null,
    maskClosable: true,
    title: t('updater.updateReady', { ns: 'electron' }),
    width: 520,
  });

const Island = ({
  children,
  ...rest
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <Surface className={stylex.props(styles.island).className} {...rest}>
    {children}
  </Surface>
);

/** The version stays out of the narrow island and shows on hover instead. */
const Status = ({
  label,
  onClick,
  version,
}: {
  label: string;
  onClick?: () => void;
  version?: string;
}) => {
  const title = version ? `${label} · ${version}` : label;

  return onClick ? (
    <button
      className={stylex.props(styles.status, styles.statusButton).className}
      title={title}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  ) : (
    <span className={stylex.props(styles.status).className} title={title}>
      {label}
    </span>
  );
};

const ActionButton = ({
  busy,
  children,
  onClick,
}: {
  busy?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    className={stylex.props(styles.action).className}
    disabled={busy}
    type="button"
    onClick={onClick}
  >
    <span className={busy ? stylex.props(styles.spin).className : undefined}>
      <Icon icon={busy ? Loader2 : RefreshCw} size={12} />
    </span>
    {children}
  </button>
);

const ProgressPill = ({ label, percent }: { label: string; percent: number | null }) => (
  <span
    aria-label={label}
    aria-valuemax={100}
    aria-valuemin={0}
    aria-valuenow={percent ?? undefined}
    className={stylex.props(styles.action, styles.progressAction).className}
    role="progressbar"
  >
    <span className={stylex.props(styles.spin).className}>
      <Icon icon={Loader2} size={12} />
    </span>
    {percent === null ? null : `${percent}%`}
  </span>
);

export const UpdateNotification: React.FC = () => {
  const { t: tElectron } = useTranslation('electron');
  const { t: tCommon } = useTranslation('common');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updaterState, setUpdaterState] = useState<UpdaterState | null>(null);
  const [installConfirmMode, setInstallConfirmMode] = useState<
    'unconfirm' | 'installLater' | 'installNow' | null
  >('unconfirm');
  const [isInstalling, setIsInstalling] = useState(false);
  const [appliedVersion, setAppliedVersion] = useState<string | null>(null);
  const receivedUpdateEvent = useRef(false);
  useEffect(() => {
    let active = true;
    rendererOtaService
      .getStatus()
      .then((status) => {
        if (!active || receivedUpdateEvent.current) return;
        setAppliedVersion((version) => version ?? status.appliedVersion ?? null);
        if (status.staged && status.applyMode) {
          setUpdateInfo(
            (current) =>
              current ?? {
                kind: status.applyMode === 'relaunch' ? 'core-relaunch' : 'core-reload',
                version: status.staged!,
              },
          );
        }
      })
      .catch(console.error);
    autoUpdateService
      .getUpdaterState()
      .then((state) => {
        if (active) setUpdaterState((current) => current ?? state);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);
  useWatchBroadcast('coreUpdateApplied', (version) => {
    receivedUpdateEvent.current = true;
    setAppliedVersion(version);
    setUpdateInfo((current) =>
      current?.version === version && current.kind !== 'app' ? null : current,
    );
    setIsInstalling(false);
  });
  useWatchBroadcast('coreUpdateDeferred', () => {
    setIsInstalling(false);
    toast.info(tElectron('updater.rendererUpdateDeferred'));
  });
  useWatchBroadcast('updaterStateChanged', (state) => {
    setUpdaterState(state);
  });

  const view = selectUpdateIsland({
    appliedVersion,
    installConfirmMode,
    updateKind: updateInfo?.kind ?? null,
    updaterStage: updaterState?.stage ?? null,
  });

  // The "updated to version" toast only shows when no pending update takes its slot
  const appliedToastHoverHandlers = useAutoDismiss(
    view === 'applied' ? appliedVersion : null,
    () => setAppliedVersion(null),
    APPLIED_TOAST_DURATION,
  );

  useWatchBroadcast('updateReady', (info) => {
    receivedUpdateEvent.current = true;
    setUpdateInfo((current) => selectUpdateInfo(current, info));
    if (info.kind === 'app' || info.kind === 'core-relaunch') setInstallConfirmMode('unconfirm');
  });

  useWatchBroadcast('updateWillInstallLater', () => {
    setInstallConfirmMode('installLater');

    setTimeout(() => setInstallConfirmMode(null), 5000);
  });

  const applyCoreUpdateNow = async (keepLoadingOnSuccess: boolean) => {
    setIsInstalling(true);
    const applied = await applyCoreUpdate(() =>
      toast.error(tElectron('updater.rendererUpdateError')),
    );
    if (!applied || !keepLoadingOnSuccess) setIsInstalling(false);
  };

  if (view === 'downloading') {
    const percent = formatUpdatePercent(updaterState?.progress?.percent);
    return (
      <Island>
        <Status
          label={tElectron('updater.downloadingUpdate')}
          version={updaterState?.updateInfo?.version}
        />
        <ProgressPill
          percent={percent}
          label={
            percent === null
              ? tElectron('updater.downloadingUpdate')
              : tCommon('downloadingUpdate', { percent })
          }
        />
      </Island>
    );
  }

  if (view === 'reload-ready' && updateInfo)
    return (
      <Island>
        <Status
          label={tElectron('updater.rendererReady', {
            version: formatCoreVersion(updateInfo.version),
          })}
        />
        <ActionButton busy={isInstalling} onClick={() => applyCoreUpdateNow(false)}>
          {tElectron('updater.upgradeNow')}
        </ActionButton>
      </Island>
    );

  if (view === 'relaunch-ready' && updateInfo)
    return (
      <Island>
        <Status
          label={tElectron('updater.updateReady')}
          version={formatCoreVersion(updateInfo.version)}
        />
        <ActionButton busy={isInstalling} onClick={() => applyCoreUpdateNow(true)}>
          {tElectron('updater.upgradeNow')}
        </ActionButton>
      </Island>
    );

  if (view === 'applied' && appliedVersion)
    return (
      <Island {...appliedToastHoverHandlers}>
        <Status
          label={tElectron('updater.rendererUpdated', {
            version: formatCoreVersion(appliedVersion),
          })}
        />
        <ActionButton
          onClick={() => {
            setAppliedVersion(null);
            rendererOtaService.dismissAppliedNotice().catch(console.error);
          }}
        >
          {tElectron('updater.ignore')}
        </ActionButton>
      </Island>
    );

  if (view === 'install-later')
    return (
      <Island>
        <Status label={tElectron('updater.willInstallLater')} />
        <button
          aria-label={tCommon('close')}
          className={stylex.props(styles.close).className}
          type="button"
          onClick={() => setInstallConfirmMode(null)}
        >
          <Icon icon={X} size={14} />
        </button>
      </Island>
    );

  if (view === 'app-ready' && updateInfo)
    return (
      <Island>
        <Status
          label={tElectron('updater.updateReady')}
          version={updateInfo.version}
          onClick={() => openUpdateDetailModal(updateInfo)}
        />
        <ActionButton
          busy={isInstalling}
          onClick={() => {
            setIsInstalling(true);
            autoUpdateService.installNow();
          }}
        >
          {tElectron('updater.upgradeNow')}
        </ActionButton>
      </Island>
    );

  return null;
};
