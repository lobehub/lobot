import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';

/**
 * Route builders for resource surfaces that are reached outside the router's
 * own navigation (copied links, `window.open`, `window.location`).
 *
 * `useWorkspaceAwareNavigate` prefixes in-app navigation automatically, but
 * these hand-built URLs must carry the active workspace slug themselves or
 * they land in the personal scope, where a workspace library or page does not
 * resolve.
 */

/**
 * Library path segment of an item: pages (`docs_` ids) open under `docs`,
 * everything else under `file`.
 */
const libraryItemSegment = (itemId: string): 'docs' | 'file' =>
  itemId.startsWith('docs_') ? 'docs' : 'file';

/** Where an item opens inside a library: `/resource/library/<id>/{docs,file}/<itemId>`. */
export const libraryItemPath = (libraryId: string, itemId: string): string =>
  `/resource/library/${libraryId}/${libraryItemSegment(itemId)}/${encodeURIComponent(itemId)}`;

/** A library's explorer, or one of its folders: `/resource/library/<id>[/folder/<folderId>]`. */
export const libraryFolderPath = (libraryId: string, folderId?: string | null): string =>
  `/resource/library/${libraryId}${folderId ? `/folder/${encodeURIComponent(folderId)}` : ''}`;

/** Path of a library's explorer: `/resource/library/<id>`. */
export const buildLibraryPath = (
  libraryId: string,
  activeWorkspaceSlug: string | null | undefined,
): string => buildWorkspaceAwarePath(`/resource/library/${libraryId}`, activeWorkspaceSlug);
