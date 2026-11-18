import type { SandboxDrive } from '@lobechat/const/builtinTools';
import { markDefaultInstances } from '@lobechat/utils/environmentInstance';
import type {
  EnvironmentConfiguration,
  EnvironmentInstanceConfiguration,
  EnvironmentInstanceKind,
  EnvironmentInstanceStatus,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import type { SandboxStorageFileList } from '@/types/serverData';

export type { SandboxDrive };

/** One environment instance row, with the caller's drive it sits on (`null` if not theirs). */
export interface SandboxInstanceDetail {
  buildError: string | null;
  buildId: string | null;
  configuration: EnvironmentInstanceConfiguration | null;
  configurationSnapshot: EnvironmentConfiguration;
  createdAt: Date;
  deviceId: string | null;
  drive: SandboxDrive | null;
  enabled: boolean;
  environmentId: string;
  id: string;
  kind: EnvironmentInstanceKind;
  name: string;
  provider: string | null;
  providerResourceId: string | null;
  providerScope: string | null;
  status: EnvironmentInstanceStatus;
  updatedAt: Date;
  workingDirectory: string;
}

/** Why a placement the topic chose falls back to a temporary sandbox. */
export type SandboxPlacementFallback =
  'directoryMissing' | 'instanceRebuildRequired' | 'instanceUnavailable' | 'rootNotAllowed';

/** Where a topic's sandbox commands run; `null` when it gets no persistent workspace. */
export interface SandboxSessionPlacement {
  cwd?: string;
  drive: SandboxDrive;
  fallback?: SandboxPlacementFallback;
  mode: 'drive' | 'ephemeral' | 'persistent';
  workingDir?: string;
}

/**
 * Renderer-side data layer for the user's network drives and the environment
 * directories initialized on them.
 *
 * `drive` names which of a workspace's drives a call means — `public`, shared
 * by every member, or `personal`, the caller's own — and defaults to the
 * public one there; a personal account has one drive and ignores it. A call
 * about an environment directory goes to the drive that directory is on.
 *
 * Every path is relative to the drive's root (`reports/q3.md`); the absolute
 * mount path stays server-side, so there is nothing here for a caller to point
 * outside the drive with.
 *
 * `topicId` is an optimization, not a scope: the drive belongs to the user (or
 * the team), not the topic, but some calls are only reachable from inside a
 * sandbox session, so naming the topic the user is already talking to reuses
 * that warm session instead of cold-starting a second sandbox.
 *
 * The definitions environments are built from need no drive and live in
 * `environmentService`.
 */
class SandboxStorageService {
  /**
   * Instances, each joined with the state the execution plane holds. A
   * brand-new instance has no snapshot yet — that is normal, not an error, and
   * the UI shows it as unused rather than missing.
   *
   * Reaching the snapshot store needs a live sandbox session, so this can take
   * seconds on a cold start and callers should render a loading state.
   *
   * Each instance carries `isDefault`, from the same rule the server's delete
   * guard applies, so no caller has to re-derive which copy is the default.
   */
  listInstances = async (
    params: {
      drive?: SandboxDrive;
      environmentId?: string;
      topicId?: string;
      withSizes?: boolean;
    } = {},
  ) => {
    const result = await lambdaClient.sandboxStorage.listInstances.query(params);

    return { ...result, instances: markDefaultInstances(result.instances) };
  };

  /** One instance, from the database alone — no sandbox session, no wait. */
  getInstance = async (params: { id: string }): Promise<SandboxInstanceDetail | null> =>
    lambdaClient.sandboxStorage.getInstance.query(params);

  createInstance = async (params: {
    environmentId: string;
    name: string;
    workingDirectory: string;
  }) => lambdaClient.sandboxStorage.createInstance.mutate(params);

  /** A second directory that starts with everything the first one had installed. */
  /**
   * Where this topic's sandbox commands run, for the prompt that describes it.
   * The placement only — the entitlement it follows never leaves the server.
   */
  resolveSessionPlacement = async (params: {
    topicId?: string;
  }): Promise<SandboxSessionPlacement | null> =>
    lambdaClient.sandboxStorage.resolveSessionPlacement.query(params);

  /**
   * Whether this account has a drive at all. Without one, the directory
   * picker's sandbox side shows the way to a plan instead of folders.
   */
  getEntitlement = async () => lambdaClient.sandboxStorage.getEntitlement.query();

  /** Quota and last measured usage of one drive. */
  getStorage = async (params: { drive?: SandboxDrive; topicId?: string } = {}) =>
    lambdaClient.sandboxStorage.getStorage.query(params);

  listFiles = async (
    params: {
      drive?: SandboxDrive;
      instanceId?: string;
      path?: string;
      recursive?: boolean;
      topicId?: string;
    } = {},
  ): Promise<SandboxStorageFileList> => lambdaClient.sandboxStorage.listFiles.query(params);
}

export const sandboxStorageService = new SandboxStorageService();
