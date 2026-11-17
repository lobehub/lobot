import type {
  CreateDocumentCommentInput,
  DocumentCommentDetail,
  DocumentCommentItem,
  DocumentCommentJson,
  DocumentCommentThread,
  DocumentLikeSummary,
} from '@lobot/types';

import { type ReplicaPagedData, type ReplicaSyncResult } from '@/libs/replica';
import type { documentCommentService } from '@/services/documentComment';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type DocumentCommentState, initialState } from './initialState';
import { DocumentCommentPrivateAction } from './privateAction';
import {
  type DocumentCommentThreadScope,
  documentCommentThreadsKey,
  type DocumentCommentThreadsParams,
  documentLikeSummaryResource,
} from './projection';
import {
  appendReply,
  appendThread,
  raiseThreadReplyCount,
  replaceReply,
  replaceThreadRoot,
} from './reducers';
import { useDocumentCommentStore } from './store';

const n = setNamespace('documentComment');

type Setter = StoreSetter<DocumentCommentState>;

type CreatedComment = NonNullable<Awaited<ReturnType<typeof documentCommentService.create>>>;

/** The feeds a root can sit in: anchored roots in the gutter's, the rest in the list's. */
const ROOT_SCOPES: DocumentCommentThreadScope[] = ['anchored', 'document'];

export interface DocumentCommentEditorValue {
  content: string;
  editorData: DocumentCommentJson;
}

export interface CreateDocumentCommentParams {
  input: CreateDocumentCommentInput;
  /** The row painted until the server answers (`createOptimisticComment`). */
  optimisticComment: DocumentCommentItem;
}

export interface CreateDocumentCommentReplyParams extends CreateDocumentCommentParams {
  rootCommentId: string;
}

/**
 * The document comment and like domain.
 *
 * Server state lives in six replicas (root feeds per scope, reply feeds,
 * comment summary, anchor list, deep-link details, like summary): each paints
 * its persisted copy on the first frame and is confirmed by the network in the
 * background. Writes go through optimistic overlays, so a failed request rolls
 * back to the confirmed value and a revalidation landing mid-request cannot
 * drop the pending row.
 */
class DocumentCommentActionImpl {
  readonly #private: DocumentCommentPrivateAction;
  readonly #set: Setter;

  constructor(
    set: Setter,
    get: () => DocumentCommentState,
    privateAction: DocumentCommentPrivateAction,
  ) {
    this.#set = set;
    this.#private = privateAction;
  }

  /**
   * Bind a like toggle's server answers to the identity it was sent from. A
   * toggle that settles after an account / workspace switch belongs to the
   * previous identity: its summary (with that user's `liked` and likers) must
   * not land in — or persist into — the new partition. The engine drops a
   * write or read captured under a scope that is no longer active.
   */
  beginLikeSettle = (documentId: string) => {
    const scope = documentLikeSummaryResource.scope.get();
    return {
      /** Confirm the server's summary after the last toggle request. */
      confirm: (summary: DocumentLikeSummary) => {
        this.#private.likeSummary.replace(documentId, summary, scope);
      },
      /** Re-read the summary after a failed toggle (rejects once the scope moved on). */
      refresh: () => this.#private.likeSummary.fetch(documentId, { fresh: true, scope }),
    };
  };

  reset = (): void => {
    this.#set(initialState, false, n('reset'));
  };
}

const { getState, setState } = useDocumentCommentStore;

export const documentCommentActions = new DocumentCommentActionImpl(
  setState,
  getState,
  new DocumentCommentPrivateAction(setState, getState),
);
