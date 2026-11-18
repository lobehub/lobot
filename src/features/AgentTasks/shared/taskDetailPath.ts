import { taskTitleSlug } from '@lobechat/utils/taskSlug';

/**
 * Path to a task detail page. `title` is optional and purely cosmetic: it adds
 * the readable slug segment (`/task/T-501/ship-the-thing`) that the routes
 * accept but never resolve against, so a caller without the title in hand still
 * produces a working link.
 */
export const taskDetailPath = (taskRef: string, agentId?: string, title?: string | null) => {
  const base = agentId ? `/agent/${agentId}/task/${taskRef}` : `/task/${taskRef}`;
  const slug = taskTitleSlug(title);

  return slug ? `${base}/${slug}` : base;
};
