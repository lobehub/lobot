import { SKILL_DRAG_MIME } from '@lobechat/const';

import type { ActionTagCategory, ActionTagType } from './types';

/**
 * Payload serialized into the drag `dataTransfer`. Mirrors the action-tag node
 * fields so the drop handler can dispatch `INSERT_ACTION_TAG_COMMAND` directly.
 */
interface SkillDragPayload {
  category: ActionTagCategory;
  label: string;
  type: ActionTagType;
}

export const readSkillDragData = (dataTransfer: DataTransfer): SkillDragPayload | undefined => {
  const raw = dataTransfer.getData(SKILL_DRAG_MIME);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<SkillDragPayload>;
    if (!parsed || typeof parsed.type !== 'string' || typeof parsed.category !== 'string') {
      return undefined;
    }
    return {
      category: parsed.category,
      label: typeof parsed.label === 'string' ? parsed.label : parsed.type,
      type: parsed.type,
    };
  } catch {
    return undefined;
  }
};
