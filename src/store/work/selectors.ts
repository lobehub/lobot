import type { WorkState } from './initialState';
import { shareVisitorDocumentKey, type ShareVisitorDocumentParams } from './projection';

export const workSelectors = {
  /** `undefined` until the document answers. */
  shareVisitorDocument: (params: ShareVisitorDocumentParams) => (s: WorkState) =>
    s.shareVisitorDocumentMap[shareVisitorDocumentKey(params)],
};
