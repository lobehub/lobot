import { CUSTOM_DOCUMENT_FILE_TYPE } from '@lobechat/const';

import { docsPagePath, RESOURCE_HOME_PATH } from '@/features/ResourceHome/paths';
import { documentService } from '@/services/document';
import type { StoreSetter } from '@/store/types';
import { DocumentSourceType } from '@/types/document';
import type { DocumentItem } from '@/types/serverData';
import { setNamespace } from '@/utils/storeDebug';

import { initialState, type PageState } from './initialState';
import { PagePrivateAction } from './privateAction';
import { documentItemToLobeDocument, PAGE_LIST_KEY, TEMP_PAGE_ID_PREFIX } from './projection';
import { usePageStore } from './store';

const n = setNamespace('page');

export interface PageUpdateParams {
  emoji?: string;
  title?: string;
}

type Setter = StoreSetter<PageState>;

class PageActionImpl {
  readonly #get: () => PageState;
  readonly #private: PagePrivateAction;
  readonly #set: Setter;

  constructor(set: Setter, get: () => PageState, privateAction: PagePrivateAction) {
    this.#set = set;
    this.#get = get;
    this.#private = privateAction;
  }

  upsertDocument = (document: DocumentItem): void => {
    const lobeDoc = documentItemToLobeDocument(document);
    this.#private.detail.update(lobeDoc.id, () => lobeDoc);
    if (this.#get().pageListMap[PAGE_LIST_KEY]?.items.some((doc) => doc.id === lobeDoc.id)) {
      this.#private.list.updateEntity(lobeDoc.id, () => lobeDoc);
    }
  };

  navigateToPage = (pageId: string | null): void => {
    this.#get().navigate?.(pageId ? docsPagePath(pageId) : RESOURCE_HOME_PATH);
  };

  createNewPage = async (title: string, visibility?: 'private' | 'public'): Promise<string> => {
    // The optimistic row lands in the requested bucket so it shows under the
    // accordion the user clicked "+" from before the server responds.
    const tempPageId = this.createOptimisticPage(title, visibility);
    this.#set({ isCreatingNew: true, selectedPageId: tempPageId }, false, n('createNewPage/start'));

    try {
      const realPage = documentItemToLobeDocument(
        await this.createPage({ content: '', title, visibility }),
      );

      this.#private.replaceListRow(tempPageId, realPage);
      this.#set(
        { isCreatingNew: false, selectedPageId: realPage.id },
        false,
        n('createNewPage/success'),
      );
      this.navigateToPage(realPage.id);

      return realPage.id;
    } catch (error) {
      console.error('Failed to create page:', error);
      this.removeTempPage(tempPageId);
      this.#set({ isCreatingNew: false, selectedPageId: null }, false, n('createNewPage/error'));
      this.navigateToPage(null);

      throw error;
    }
  };

  createOptimisticPage = (
    title: string = 'Untitled',
    visibility?: 'private' | 'public',
  ): string => {
    const tempId = `${TEMP_PAGE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    this.#private.insertListRow({
      content: null,
      createdAt: now,
      editorData: null,
      fileType: CUSTOM_DOCUMENT_FILE_TYPE,
      filename: title,
      id: tempId,
      metadata: {},
      source: 'document',
      sourceType: DocumentSourceType.EDITOR,
      title,
      totalCharCount: 0,
      totalLineCount: 0,
      updatedAt: now,
      visibility: visibility ?? null,
    });

    return tempId;
  };

  createPage = async ({
    title,
    content = '',
    knowledgeBaseId,
    parentId,
    visibility,
  }: {
    content?: string;
    knowledgeBaseId?: string;
    parentId?: string;
    title: string;
    visibility?: 'private' | 'public';
  }): Promise<DocumentItem> =>
    documentService.createDocument({
      content,
      editorData: '{}',
      fileType: CUSTOM_DOCUMENT_FILE_TYPE,
      knowledgeBaseId,
      metadata: { createdAt: Date.now() },
      parentId,
      title,
      visibility,
    });

  removeTempPage = (tempId: string): void => {
    this.#private.entity.remove(tempId);
  };

  reset = (): void => {
    this.#set(initialState, false, n('reset'));
  };
}

const { getState, setState } = usePageStore;

export const pageActions = new PageActionImpl(
  setState,
  getState,
  new PagePrivateAction(setState, getState),
);
