import type { ChannelReplyJob } from '@lobot/types';
import { useTranslation } from 'react-i18next';

import { deviceSelectors, useDeviceStore } from '@/store/device';

import { deviceLabel } from './CreateChannel/EnvironmentFields';
import { queueHead, replyJobStatus, replyJobTone } from './jobStatus';

/**
 * A reply's status line among the conversation's replies. One queued behind a reply that waits
 * for its device names that device, when the viewer's device list knows it.
 */
export const useReplyStatusLabel = <T extends ChannelReplyJob & { deviceId?: string | null }>(
  job: T,
  jobs: T[],
) => {
  const { t } = useTranslation('channel');
  const status = replyJobStatus(job, jobs);
  const deviceId = status === 'queue.waitingDevice' ? queueHead(job, jobs)?.deviceId : undefined;
  const device = useDeviceStore(deviceSelectors.getDeviceById(deviceId ?? undefined));
  const label =
    status === 'queue.waitingDevice'
      ? device
        ? t('queue.waitingDevice', { name: deviceLabel(device) })
        : t('blocked.device_offline')
      : t(status);
  return { label, tone: replyJobTone(job, jobs) };
};
