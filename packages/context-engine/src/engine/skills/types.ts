import type { SkillMeta } from '../../providers/SkillContextProvider';

/**
 * Operation-level skill set: determined at createOperation time, immutable during execution.
 * Analogous to OperationToolSet for tools.
 */
export interface OperationSkillSet {
  /** Plugin IDs enabled on this agent — skills matching these IDs are auto-activated */
  enabledPluginIds: string[];
  /** All available skills after enableChecker filtering */
  skills: SkillMeta[];
}

/**
 * Record of a skill activated at step level (e.g., via activateSkill tool call).
 */
export interface ActivatedStepSkill {
  activatedAtStep: number;
  content?: string;
  identifier: string;
}
