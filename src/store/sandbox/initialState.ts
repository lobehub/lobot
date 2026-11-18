import { createReplicaState, type ReplicaState } from '@/libs/replica';

import type {
  SandboxEntitlement,
  SandboxGithubRepositories,
  SandboxInstanceDirectory,
  SandboxPickerEnvironment,
  SandboxPickerInstanceList,
  SandboxPlacementCheck,
} from './projection';

export interface SandboxState {
  /** `sandboxEntitlementMap[SANDBOX_SCOPE_ENTRY]`: the active workspace's answer. */
  sandboxEntitlementMap: Record<string, SandboxEntitlement>;
  sandboxEntitlementReplica: ReplicaState<SandboxEntitlement>;
  /** `sandboxEnvironmentsMap[SANDBOX_SCOPE_ENTRY]`: the picker's environments. */
  sandboxEnvironmentsMap: Record<string, SandboxPickerEnvironment[]>;
  sandboxEnvironmentsReplica: ReplicaState<SandboxPickerEnvironment[]>;
  /** `sandboxGithubRepositoriesMap[SANDBOX_SCOPE_ENTRY]`: repositories an environment can clone. */
  sandboxGithubRepositoriesMap: Record<string, SandboxGithubRepositories>;
  sandboxGithubRepositoriesReplica: ReplicaState<SandboxGithubRepositories>;
  /** `sandboxInstanceDirectoryMap[instanceId]`: where a bound instance's files live. */
  sandboxInstanceDirectoryMap: Record<string, SandboxInstanceDirectory>;
  sandboxInstanceDirectoryReplica: ReplicaState<SandboxInstanceDirectory>;
  /** `sandboxInstancesMap[SANDBOX_SCOPE_ENTRY]`: the picker's copies. */
  sandboxInstancesMap: Record<string, SandboxPickerInstanceList>;
  sandboxInstancesReplica: ReplicaState<SandboxPickerInstanceList>;
  /** `sandboxPlacementMap[sandboxPlacementKey(params)]`: whether a topic's pick still holds. */
  sandboxPlacementMap: Record<string, SandboxPlacementCheck>;
  sandboxPlacementReplica: ReplicaState<SandboxPlacementCheck>;
}

export const initialState: SandboxState = {
  sandboxEntitlementMap: {},
  sandboxEntitlementReplica: createReplicaState(),
  sandboxEnvironmentsMap: {},
  sandboxEnvironmentsReplica: createReplicaState(),
  sandboxGithubRepositoriesMap: {},
  sandboxGithubRepositoriesReplica: createReplicaState(),
  sandboxInstanceDirectoryMap: {},
  sandboxInstanceDirectoryReplica: createReplicaState(),
  sandboxInstancesMap: {},
  sandboxInstancesReplica: createReplicaState(),
  sandboxPlacementMap: {},
  sandboxPlacementReplica: createReplicaState(),
};
