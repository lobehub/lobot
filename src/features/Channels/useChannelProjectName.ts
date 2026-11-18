import { projectListItemSelector, useProjectStore } from '@/store/project';

/** The name of the project a Channel belongs to, once the project list has it. */
export const useChannelProjectName = (projectId: string | null | undefined) =>
  useProjectStore((state) => projectListItemSelector(projectId)(state)?.name);
