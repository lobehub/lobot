import { BUILTIN_AGENT_SLUGS } from '@lobechat/const/builtinAgents';
import type { SidebarAgentItem } from '@lobot/types';

import { usableBackground } from '@/components/Avatar/fallback';

const BUILTIN_SLUGS = new Set<string>(Object.values(BUILTIN_AGENT_SLUGS));

const IMAGE_SOURCE_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/i;

/**
 * Agent `backgroundColor` historically stored CSS colors; it now stores the profile cover image.
 * Only image-like sources count, so legacy colors resolve to no cover.
 */
const resolveAgentBackground = (value?: string | null): string | undefined => {
  const source = value?.trim();
  return source && IMAGE_SOURCE_PATTERN.test(source) ? source : undefined;
};

/**
 * Labels that mark an event / limited-time agent. Only these earn the arch
 * badge above the avatar — regular agents stay clean.
 */
const EVENT_LABEL_PATTERN = /\b(?:hackathons?|events?|limited)\b|限定|活动/i;

export type AgentBottomPendant = 'official';

export interface AgentTopPendant {
  color?: string | null;
  label: string;
}

interface AgentBadge {
  /** Short identity chip pinned to the avatar's bottom edge. */
  bottom?: AgentBottomPendant;
  /** Cover color the agent picked; absent lets the card derive one from the avatar. */
  cover?: string;
  /** Profile cover image the agent uploaded; shown as-is instead of a tinted band. */
  coverImage?: string;
  /** Arch badge above the avatar, reserved for event / limited agents. */
  top?: AgentTopPendant;
}

/**
 * Data-driven badge decorations for the agent list's badge wall. Most agents
 * resolve to nothing, so the wall doesn't turn into a sticker board:
 * - cover: the profile cover image, else the background color the agent picked;
 * - bottom chip: only builtin agents, reading "official";
 * - top arch: only agents carrying an event / limited label.
 */
export const resolveAgentBadge = (item: SidebarAgentItem): AgentBadge => {
  const badge: AgentBadge = {};

  // `backgroundColor` now stores the profile cover image (see
  // resolveAgentBackground); only legacy rows still hold a color. The swatch
  // picker's "default" entry stores a transparent color, which means "no color
  // chosen" — same rule as the avatar fallback.
  const coverImage = resolveAgentBackground(item.backgroundColor);
  if (coverImage) badge.coverImage = coverImage;
  else {
    const cover = usableBackground(item.backgroundColor);
    if (cover) badge.cover = cover;
  }

  if (item.slug && BUILTIN_SLUGS.has(item.slug)) badge.bottom = 'official';

  const eventLabel = item.labels?.find((label) => EVENT_LABEL_PATTERN.test(label.name));
  if (eventLabel) badge.top = { color: eventLabel.color, label: eventLabel.name };

  return badge;
};
