import type { SandboxState } from './initialState';
import {
  SANDBOX_SCOPE_ENTRY,
  type SandboxEntitlement,
  type SandboxGithubRepositories,
  type SandboxInstanceDirectory,
  type SandboxPickerEnvironment,
  type SandboxPlacementCheck,
  sandboxPlacementKey,
  type SandboxPlacementParams,
} from './projection';

/** The active workspace's entitlement, or `undefined` before its first paint. */
const entitlement = (s: SandboxState): SandboxEntitlement | undefined =>
  s.sandboxEntitlementMap[SANDBOX_SCOPE_ENTRY];

/** The scope's environments, or `undefined` until storage or the server answers. */
const environments = (s: SandboxState): SandboxPickerEnvironment[] | undefined =>
  s.sandboxEnvironmentsMap[SANDBOX_SCOPE_ENTRY];

const githubRepositories = (s: SandboxState): SandboxGithubRepositories | undefined =>
  s.sandboxGithubRepositoriesMap[SANDBOX_SCOPE_ENTRY];

const instanceDirectory =
  (instanceId: string | undefined) =>
  (s: SandboxState): SandboxInstanceDirectory | undefined =>
    instanceId ? s.sandboxInstanceDirectoryMap[instanceId] : undefined;

const placement =
  (params: SandboxPlacementParams | null) =>
  (s: SandboxState): SandboxPlacementCheck | undefined =>
    params ? s.sandboxPlacementMap[sandboxPlacementKey(params)] : undefined;

export const sandboxSelectors = {
  entitlement,
  environments,
  githubRepositories,
  instanceDirectory,
  placement,
};
