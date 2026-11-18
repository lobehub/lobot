import { standardizeIdentifier } from '@/utils/identifier';

/**
 * Docs (`/resource`) has five sections: the home dashboard, the drive (every
 * uploaded file by type), the cloud sandbox's storage, the library gallery and
 * the Works gallery. Paths are written without the workspace prefix;
 * navigation adds it.
 */
export const RESOURCE_HOME_PATH = '/resource';

/**
 * Where a page opens inside Docs: `/resource/page/<id>`, with the short id the
 * Pages module used (`docs_` prefix dropped), so writing a page never leaves Docs.
 */
export const docsPagePath = (pageId: string): string =>
  `${RESOURCE_HOME_PATH}/page/${encodeURIComponent(standardizeIdentifier(pageId))}`;

/** Where an uploaded file opens inside Docs: `/resource/file/<id>`. */
export const docsFilePath = (fileId: string): string =>
  `${RESOURCE_HOME_PATH}/file/${encodeURIComponent(fileId)}`;
