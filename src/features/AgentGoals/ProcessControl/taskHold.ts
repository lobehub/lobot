import { cssVar } from '@lobehub/ui';
import { TriangleAlert } from 'lucide-react';

import { type ExecutionStatusVisual, TASK_STATUS_VISUALS } from '@/components/ExecutionStatus';

/**
 * A Task the coordinator holds without anyone needing to act: either its run
 * went quiet past the lease (it restarts on the next advance) or a usage window
 * refused it (it resumes after the reset). Neither is a failure, so neither
 * borrows the failed red cross.
 */
export const TASK_HOLD_VISUALS = {
  stalled: { color: cssVar.colorWarning, icon: TriangleAlert },
  waitingQuota: TASK_STATUS_VISUALS.scheduled,
} satisfies Record<string, ExecutionStatusVisual>;
