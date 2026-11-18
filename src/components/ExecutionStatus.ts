import { cssVar } from '@lobehub/ui';
import type { TaskStatus } from '@lobot/types';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  CircleX,
  Clock,
  HandIcon,
} from 'lucide-react';

export interface ExecutionStatusVisual {
  color: string;
  icon: LucideIcon;
}

/**
 * Canonical glyph + color per execution-status semantic, shared by tasks and
 * topics (sidebar rows, group headers, kanban columns, management table). One
 * semantic → one visual, so the same state never renders with
 * different icons across surfaces. Live "running" rows may still swap the
 * static glyph for the animated `RingLoadingIcon` — same circle family and
 * warning color, animation just signals liveness.
 */
const VISUALS = {
  archived: { color: cssVar.colorTextDescription, icon: Archive },
  backlog: { color: cssVar.colorTextQuaternary, icon: CircleDashed },
  canceled: { color: cssVar.colorTextSecondary, icon: CircleSlash },
  completed: { color: cssVar.colorSuccess, icon: CircleCheck },
  failed: { color: cssVar.colorError, icon: CircleX },
  idle: { color: cssVar.colorTextTertiary, icon: Circle },
  running: { color: cssVar.colorWarning, icon: CircleDot },
  scheduled: { color: cssVar.colorWarning, icon: Clock },
  waitingForHuman: { color: cssVar.colorInfo, icon: HandIcon },
} satisfies Record<string, ExecutionStatusVisual>;

export const TASK_STATUS_VISUALS: Record<TaskStatus, ExecutionStatusVisual> = {
  backlog: VISUALS.backlog,
  canceled: VISUALS.canceled,
  completed: VISUALS.completed,
  failed: VISUALS.failed,
  // Task `paused` is surfaced as "Pending review" — same semantic as a topic
  // waiting for human input, so it shares the hand glyph.
  paused: VISUALS.waitingForHuman,
  running: VISUALS.running,
  scheduled: VISUALS.scheduled,
};
