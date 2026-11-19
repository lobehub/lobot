import type { HighlighterProps, LobePrimaryColor, MermaidProps, NeutralColors } from '@lobehub/ui';

import type { ResponseAnimationStyle } from '../../aiProvider';

export type AnimationMode = 'disabled' | 'agile' | 'elegant';

export type ContextMenuMode = 'disabled' | 'default';

/**
 * How pinned conversations sit atop the Messages list: `tiles` is the avatar grid; `rows` keeps
 * the grid for up to six and lists more as one tinted block of rows.
 */
export type PinnedConversationLayout = 'tiles' | 'rows';

export interface UserGeneralConfig {
  animationMode?: AnimationMode;
  contextMenuMode?: ContextMenuMode;
  costEstimateWarningThreshold?: number;
  /**
   * Whether to auto-scroll during AI streaming output
   * @default true
   */
  enableAutoScrollOnStreaming?: boolean;
  /**
   * Whether to show the website/favicon icon before links in chat messages.
   * Turning it off renders plain links, which copy cleanly into email and other apps.
   * @default true
   */
  enableMessageLinkIcon?: boolean;
  /**
   * Whether Markdown pasted into the chat input is converted into rich text.
   * Off keeps the pasted text verbatim.
   * @default true
   */
  enablePasteAutoConvert?: boolean;
  /**
   * Whether a turn's tool workflow starts expanded while the agent is still
   * running. Off keeps the running turn to a single live headline row.
   * @default false
   */
  expandWorkflowWhileStreaming?: boolean;
  /**
   * Grayscale font antialiasing on macOS. Off falls back to the system default rendering.
   * @default true
   */
  fontAntialiasing?: boolean;
  fontSize: number;
  highlighterTheme?: HighlighterProps['theme'];
  isDevMode: boolean;
  isLiteMode: boolean;
  mermaidTheme?: MermaidProps['theme'];
  neutralColor?: NeutralColors;
  /**
   * Pinned conversations in the Messages list. `rows` lists them as rows once more than six are
   * pinned, where the grid gets crowded.
   * @default 'tiles'
   */
  pinnedConversationLayout?: PinnedConversationLayout;
  primaryColor?: LobePrimaryColor;
  responseLanguage?: string;
  /**
   * The workspace column on the left of the list. Off until the user turns it
   * on in Appearance; a server without workspaces still shows nothing.
   * @default false
   */
  showWorkspaceRail?: boolean;
  telemetry: boolean;
  timezone?: string;
  transitionMode?: ResponseAnimationStyle;
}
