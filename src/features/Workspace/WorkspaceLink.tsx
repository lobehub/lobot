'use client';

import { type AnchorHTMLAttributes, type Ref } from 'react';
import { Link, type LinkProps } from 'react-router';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { openContactsFromUrl } from '@/features/NavRail/contactsPopupStore';

import { buildWorkspaceAwarePath } from './workspaceAwarePath';

export interface WorkspaceLinkProps extends Omit<LinkProps, 'to' | 'ref'> {
  /** When true, do not apply the workspace prefix. */
  escape?: boolean;
  /**
   * Widened to `HTMLElement` so existing sidebar callsites passing a
   * `useState<HTMLElement | null>` setter work without changes.
   */
  ref?: Ref<HTMLElement>;
  /** Same semantics as `<Link to>` but auto-prefixed with the active workspace slug. */
  to: string;
}

const WorkspaceLink = ({ ref, to, escape, onClick, ...rest }: WorkspaceLinkProps) => {
  const activeSlug = useActiveWorkspaceSlug();
  const target = buildWorkspaceAwarePath(to, activeSlug, { escape });
  return (
    <Link
      ref={ref as Ref<HTMLAnchorElement>}
      to={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // A new tab can still open the full-screen page. An ordinary click
        // opens the address book on this contact instead.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
          return;
        if (openContactsFromUrl(to)) event.preventDefault();
      }}
      {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
    />
  );
};

WorkspaceLink.displayName = 'WorkspaceLink';

export default WorkspaceLink;
