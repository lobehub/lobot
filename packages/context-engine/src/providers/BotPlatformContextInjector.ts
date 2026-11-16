import type { BotPlatformInfo } from '@lobechat/prompts';

export interface BotPlatformContext {
  /** Whether the platform can read chat history at runtime (`readMessages`). */
  canReadHistory?: boolean;
  /** Identifiers of the conversation this run replies in (`lobe-message` args). */
  currentChannel?: BotPlatformInfo['currentChannel'];
  /** The bot woke on its own because a message falls within its duties (see `formatBotPlatformContext`). */
  duty?: BotPlatformInfo['duty'];
  /** The bot woke in its follow-up window (see `formatBotPlatformContext`). */
  followup?: BotPlatformInfo['followup'];
  /** The bot woke only because its name is in the text (see `formatBotPlatformContext`). */
  named?: boolean;
  /** Acknowledgement already posted before the run (see `formatBotPlatformContext`). */
  openingReply?: BotPlatformInfo['openingReply'];
  platformName: string;
  /** Pre-injected recent same-channel history for platforms without history-read. */
  recentChannelHistory?: BotPlatformInfo['recentChannelHistory'];
  /** Emoji the owner lets the bot use (see `formatBotPlatformContext`). */
  replyEmojis?: BotPlatformInfo['replyEmojis'];
  /** How the bot talks in this conversation (see `formatBotPlatformContext`). */
  replyStyle?: BotPlatformInfo['replyStyle'];
  /** The agent may step back from the conversation (see `formatBotPlatformContext`). */
  standDown?: boolean;
  supportsMarkdown: boolean;
  /** `followup` tells the agent it may stay silent (see `formatBotPlatformContext`). */
  wakeKind?: BotPlatformInfo['wakeKind'];
  warnings?: string[];
}
