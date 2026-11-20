import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  DesktopNotificationResult,
  ShowDesktopNotificationParams,
} from '@lobechat/electron-client-ipc';
import type { NativeImage } from 'electron';
import { nativeImage, Notification } from 'electron';

import type { App } from '@/core/App';
import { createLogger } from '@/utils/logger';
import { windows } from '@/utils/platform';

const logger = createLogger('controllers:NotificationCtr');

const NAVIGATE_MAP_LIMIT = 100;

export const toLoggableNotificationParams = (params: ShowDesktopNotificationParams) => {
  if (!params.sender?.avatarDataUrl) return params;
  return {
    ...params,
    sender: { ...params.sender, avatarDataUrl: '[redacted]' },
  };
};

export const isMainWindowHidden = (app: App): boolean => {
  try {
    const browserWindow = app.browserManager.getMainWindow().browserWindow;
    if (browserWindow.isDestroyed()) return true;

    const isVisible = browserWindow.isVisible();
    const isFocused = browserWindow.isFocused();
    const isMinimized = browserWindow.isMinimized();
    logger.debug('Window state check:', { isFocused, isMinimized, isVisible });
    return !isVisible || isMinimized || !isFocused;
  } catch (error) {
    logger.error('Failed to check window state:', error);
    return true;
  }
};

export const openNotificationTarget = (
  app: App,
  navigate?: ShowDesktopNotificationParams['navigate'],
) => {
  app.browserManager.showMainWindow();
  if (navigate?.path) {
    app.browserManager.getMainWindow().broadcast('navigate', navigate);
  }
};

export const rememberNavigate = (
  map: Map<string, ShowDesktopNotificationParams['navigate']>,
  id: string,
  navigate: ShowDesktopNotificationParams['navigate'],
) => {
  if (!navigate?.path) return;
  map.set(id, navigate);
  if (map.size <= NAVIGATE_MAP_LIMIT) return;
  const oldest = map.keys().next().value;
  if (oldest) map.delete(oldest);
};

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Windows draws the sender image in the app-icon slot and crops it to a circle, the way Discord's
 * toasts do. Electron's `icon` option uses the same slot but leaves the crop square, so an avatar
 * goes through toast XML instead. The XML replaces the other options; the click listener does not.
 */
export const windowsAvatarToastXml = ({
  body,
  silent,
  src,
  title,
}: {
  body: string;
  silent?: boolean;
  src: string;
  title: string;
}) => {
  const audio = silent ? '<audio silent="true"/>' : '';
  return (
    '<toast><visual><binding template="ToastGeneric">' +
    `<text>${escapeXml(title)}</text>` +
    `<text>${escapeXml(body)}</text>` +
    `<image placement="appLogoOverride" hint-crop="circle" src="${escapeXml(src)}"/>` +
    `</binding></visual>${audio}</toast>`
  );
};

const notificationIcon = (dataUrl?: string): NativeImage | undefined => {
  if (!dataUrl) return undefined;
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    return image.isEmpty() ? undefined : image;
  } catch (error) {
    logger.error('Failed to decode notification avatar:', error);
    return undefined;
  }
};

/** A file URL Windows can load after the toast is shown. The same avatar keeps one file. */
const saveNotificationAvatar = async (image: NativeImage): Promise<string | undefined> => {
  try {
    const png = image.toPNG();
    if (png.length === 0) return undefined;
    const dir = path.join(tmpdir(), 'lobot-notification-avatars');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${createHash('sha1').update(png).digest('hex')}.png`);
    await writeFile(file, png);
    return pathToFileURL(file).href;
  } catch (error) {
    logger.error('Failed to prepare notification avatar:', error);
    return undefined;
  }
};

interface ElectronNotificationArgs {
  onClick: () => void;
  params: ShowDesktopNotificationParams;
  urgency: 'low' | 'normal';
}

const presentNotification = (
  options: ConstructorParameters<typeof Notification>[0],
  onClick: () => void,
): Promise<DesktopNotificationResult> => {
  const notification = new Notification(options);

  notification.on('show', () => {
    logger.info('Notification shown');
  });

  notification.on('click', () => {
    logger.debug('User clicked notification, showing main window');
    onClick();
  });

  notification.on('close', () => {
    logger.debug('Notification closed');
  });

  notification.on('failed', (error) => {
    logger.error('Notification display failed:', error);
  });

  return new Promise((resolve) => {
    notification.show();
    setTimeout(() => {
      logger.info('Notification display call completed');
      resolve({ success: true });
    }, 100);
  });
};

const plainNotificationOptions = (
  { params, urgency }: ElectronNotificationArgs,
  icon?: NativeImage,
) => ({
  body: params.body,
  hasReply: false as const,
  ...(icon ? { icon } : {}),
  silent: params.silent || false,
  sound: params.soundName,
  timeoutType: 'default' as const,
  title: params.title,
  urgency,
});

/**
 * Windows avatar toasts need the image on disk before the toast XML exists. That wait happens
 * only on this branch: the plain path stays synchronous so a banner without an avatar is shown
 * before the call returns to its caller.
 */
const showWithWindowsAvatar = async (
  args: ElectronNotificationArgs,
): Promise<DesktopNotificationResult> => {
  const icon = notificationIcon(args.params.sender?.avatarDataUrl);
  const src = icon ? await saveNotificationAvatar(icon) : undefined;
  if (!src) return presentNotification(plainNotificationOptions(args, icon), args.onClick);

  return presentNotification(
    {
      toastXml: windowsAvatarToastXml({
        body: args.params.body,
        silent: args.params.silent,
        src,
        title: args.params.title,
      }),
    },
    args.onClick,
  );
};

export const showElectronNotification = (
  args: ElectronNotificationArgs,
): Promise<DesktopNotificationResult> =>
  windows() && args.params.sender?.avatarDataUrl
    ? showWithWindowsAvatar(args)
    : presentNotification(
        plainNotificationOptions(args, notificationIcon(args.params.sender?.avatarDataUrl)),
        args.onClick,
      );
