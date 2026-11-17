import { CUSTOM_DOCUMENT_FILE_TYPE } from '@lobechat/const';
import type { SQL } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { documents } from '../schemas';

/** SQL twin of `isFileBackedPlaceholder`: rows holding the file's text, not its placeholder. */
export const notFileBackedPlaceholder = (): SQL<boolean> =>
  sql<boolean>`NOT (
    ${documents.sourceType} = 'file'
    AND ${documents.fileId} IS NOT NULL
    AND COALESCE(${documents.content}, '') = ''
    AND ${documents.fileType} IS DISTINCT FROM ${CUSTOM_DOCUMENT_FILE_TYPE}
  )`;
