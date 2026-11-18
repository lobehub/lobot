import { type StoreSetter } from '@/store/types';

import { type FileStore } from '../../store';

type Setter = StoreSetter<FileStore>;
export const createFileChunkSlice = (set: Setter, get: () => FileStore, _api?: unknown) =>
  new FileChunkActionImpl(set, get, _api);

class FileChunkActionImpl {
  constructor(set: Setter, get: () => FileStore, _api?: unknown) {
    void _api;
    void get;
  }
}

export type FileChunkAction = Pick<FileChunkActionImpl, keyof FileChunkActionImpl>;
