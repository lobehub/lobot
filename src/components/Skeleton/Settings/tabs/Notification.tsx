'use client';

import { Flexbox } from '@lobehub/ui';

import { SettingsFormSkeleton, SWITCH_CONTROL } from '../Section';
import { useSkeletonText } from '../useSkeletonText';
import type { SettingsTabSkeleton } from './types';

const SELECT = { height: 32, width: 220 };

/** Completion sound and banner groups. The message-level row does not wait on them. */
export const NotificationSoundsSkeleton = () => {
  const text = useSkeletonText('setting');

  return (
    <SettingsFormSkeleton
      groups={[
        {
          items: [
            {
              control: SWITCH_CONTROL,
              desc: text('completionSound.desc', 280, 12),
              label: text('completionSound.enabled', 96, 14),
              minWidth: undefined,
            },
            {
              control: SELECT,
              desc: text('completionSound.importHint', 240, 12),
              divider: true,
              label: text('completionSound.sound', 48, 14),
              minWidth: undefined,
            },
            {
              control: { height: 16, width: 160 },
              divider: true,
              label: text('completionSound.volume', 48, 14),
              minWidth: undefined,
            },
          ],
          title: text('completionSound.title', 80, 18),
        },
        {
          items: [
            {
              control: SELECT,
              desc: text('completionSound.banner.desc', 240, 12),
              label: text('completionSound.banner.label', 72, 14),
              minWidth: undefined,
            },
          ],
          title: text('completionSound.banner.title', 80, 18),
        },
      ]}
    />
  );
};

/** The notification tab: message level, then completion sound and the banner sound. */
const Body = () => {
  const text = useSkeletonText('setting');

  return (
    <Flexbox aria-busy gap={20}>
      <SettingsFormSkeleton
        groups={[
          {
            items: [
              {
                control: SELECT,
                desc: text('channelNotification.desc.all', 240, 12),
                label: text('channelNotification.label', 72, 14),
                minWidth: undefined,
              },
            ],
            title: text('channelNotification.title', 80, 18),
          },
        ]}
      />
      <NotificationSoundsSkeleton />
    </Flexbox>
  );
};

const NotificationSkeleton = { Body } satisfies SettingsTabSkeleton;

export default NotificationSkeleton;
