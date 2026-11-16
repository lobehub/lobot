import { Discord, IMessage, Slack, Telegram, WeChat } from '@lobehub/ui/icons';

import type { MessengerPlatform } from './platforms';

export { type MessengerPlatform, SUPPORTED_MESSENGER_PLATFORMS } from './platforms';

export const PlatformAvatar = ({
  platform,
  size,
}: {
  platform: MessengerPlatform;
  size: number;
}) => {
  if (platform === 'telegram') return <Telegram.Avatar size={size} />;
  if (platform === 'discord') return <Discord.Avatar size={size} />;
  if (platform === 'wechat') return <WeChat.Avatar size={size} />;
  if (platform === 'linq') return <IMessage.Avatar size={size} />;
  return <Slack.Avatar size={size} />;
};
