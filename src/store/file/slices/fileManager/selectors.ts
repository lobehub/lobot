import { type FilesStoreState } from '@/store/file/initialState';
import { type FileListItem } from '@/types/files';
import { type FileUploadStatus } from '@/types/files/upload';

const uploadStatusArray = new Set(['uploading', 'pending', 'processing']);

const dockFileList = (s: FilesStoreState) => s.dockUploadFileList;
const getFileById = (id?: string | null) => (s: FilesStoreState) => {
  if (!id) return;

  return s.fileList.find((item) => item.id === id);
};

const getFileByChunkTargetId = (id?: string | null) => (s: FilesStoreState) => {
  if (!id) return;

  return (
    getFileById(id)(s) ??
    (s.resourceMap.get(id) as FileListItem | undefined) ??
    ([...s.resourceMap.values()].find((item) => item.fileId === id) as FileListItem | undefined) ??
    (s.resourceList.find((item) => item.id === id || item.fileId === id) as
      FileListItem | undefined)
  );
};

export const fileManagerSelectors = {
  dockFileList,
  getFileByChunkTargetId,
  getFileById,
};
