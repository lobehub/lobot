import type { GitWorkingTreeFiles, ProjectFileIndexResult } from '@lobechat/electron-client-ipc';

import { AppIndexedDBStorage, AppLocalStorage, defineReplica } from '@/libs/replica';
import { localFileKeys } from '@/libs/swr/keys';

import {
  GIT_WORKING_TREE_PERSIST_MAX_ROWS,
  gitWorkingTreeFilesCodec,
  PROJECT_INDEX_PERSIST_MAX_ROWS,
  projectIndexCodec,
  withPersistCodec,
} from './codec';

export interface ProjectIndexParams {
  deviceId?: string;
  dirPath: string;
  sandboxInstanceId?: string;
  sandboxTopicId?: string;
}

export interface GitWorkingTreeFilesParams {
  deviceId?: string;
  dirPath: string;
}

/**
 * The host is part of the identity: the same path on a device and in the
 * sandbox are different trees, and `undefined` already means "this machine".
 * Keyed by the INSTANCE where there is one — two conversations running the
 * same instance are looking at one tree, and keying by topic would fetch it
 * twice and let one go stale while the other refreshed.
 */
const projectIndexHost = ({
  deviceId,
  sandboxInstanceId,
  sandboxTopicId,
}: Omit<ProjectIndexParams, 'dirPath'>): string | undefined =>
  sandboxInstanceId || sandboxTopicId ? `sandbox:${sandboxInstanceId ?? sandboxTopicId}` : deviceId;

const entryKey = (host: string | undefined, dirPath: string) =>
  JSON.stringify([host ?? 'local', dirPath]);

/**
 * The Files tab project tree of one directory on one host (device / sandbox
 * instance / this machine), partitioned by identity scope. Persisted slim
 * (`projectIndexCodec`) and for the most recent directories only, so a reload
 * paints the last tree while the host is asked again.
 *
 * The sync adopts the `localFile:projectIndex` key: file operations revalidate
 * the tree through it (`refreshProjectFiles`).
 */
export const projectIndexResource = defineReplica<
  ProjectIndexParams,
  ProjectFileIndexResult,
  ProjectFileIndexResult | undefined
>({
  key: (params) => entryKey(projectIndexHost(params), params.dirPath),
  name: 'projectFileIndex',
  persist: { maxEntries: PROJECT_INDEX_PERSIST_MAX_ROWS },
  storage: (namespace) =>
    withPersistCodec(new AppIndexedDBStorage({ namespace }), projectIndexCodec),
  syncKey: (params) => localFileKeys.projectIndex(projectIndexHost(params), params.dirPath),
  version: 1,
});

/**
 * The git dirty-file overlay of the Files tree for one directory on one host.
 * The sync adopts `localFile:gitWorkingTreeFiles`, which file operations and
 * the Review tab revalidate.
 */
export const gitWorkingTreeFilesResource = defineReplica<
  GitWorkingTreeFilesParams,
  GitWorkingTreeFiles,
  GitWorkingTreeFiles | undefined
>({
  key: ({ deviceId, dirPath }) => entryKey(deviceId, dirPath),
  name: 'gitWorkingTreeFiles',
  persist: { maxEntries: GIT_WORKING_TREE_PERSIST_MAX_ROWS },
  storage: (namespace) =>
    withPersistCodec(new AppIndexedDBStorage({ namespace }), gitWorkingTreeFilesCodec),
  syncKey: ({ deviceId, dirPath }) => localFileKeys.gitWorkingTreeFiles(deviceId, dirPath),
  version: 1,
});

export interface FilesLocation {
  /** Remote device the tree is read from; undefined is this machine. */
  deviceId?: string;
  directory: string;
}

export interface FilesLocationParams {
  /** `topic:<id>` / `agent:<id>`: the conversation the Files tab belongs to. */
  contextKey: string;
}

/**
 * Where the Files tab of a conversation last read its tree (host + directory),
 * so a cold start opens that tree before the device list can resolve it. Local
 * only (no fetcher): written once the live resolution settles. Kept in
 * localStorage for the most recent conversations, per identity scope.
 */
export const filesLocationResource = defineReplica<FilesLocationParams, FilesLocation>({
  key: ({ contextKey }) => contextKey,
  name: 'filesLocation',
  persist: { maxEntries: 100 },
  storage: (namespace) => new AppLocalStorage<FilesLocation>({ namespace }),
  version: 1,
});
