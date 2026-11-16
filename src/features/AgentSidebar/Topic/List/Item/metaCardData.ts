import { cssVar } from '@lobehub/ui';
import type { LucideIcon } from 'lucide-react';
import { GitMerge, GitPullRequestArrow, GitPullRequestClosed } from 'lucide-react';

type PullRequestState = 'open' | 'merged' | 'closed';

// GitHub merged-PR purple. Kept as a constant since antd's token set has no
// semantic "merged" color; the green (success) / red (error) come from tokens.
export const MERGED_PURPLE = '#8957e5';

export interface PullRequestStateVisual {
  color: string;
  icon: LucideIcon;
  labelKey: 'metaCard.pr.closed' | 'metaCard.pr.merged' | 'metaCard.pr.open';
}

export const PR_STATE_VISUAL: Record<PullRequestState, PullRequestStateVisual> = {
  closed: { color: cssVar.colorError, icon: GitPullRequestClosed, labelKey: 'metaCard.pr.closed' },
  merged: { color: MERGED_PURPLE, icon: GitMerge, labelKey: 'metaCard.pr.merged' },
  open: { color: cssVar.colorSuccess, icon: GitPullRequestArrow, labelKey: 'metaCard.pr.open' },
};
