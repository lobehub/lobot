import type { AgentState } from '../types';

/** Every place a run's tool set can be found on the state. */
type ToolSetCarrier = Pick<
  AgentState,
  | 'activatedStepTools'
  | 'operationToolSet'
  | 'toolExecutorMap'
  | 'toolManifestMap'
  | 'toolSourceMap'
  | 'tools'
>;

const selectToolManifestMap = (state: Partial<ToolSetCarrier>): Record<string, any> =>
  state.operationToolSet?.manifestMap ?? state.toolManifestMap ?? {};

/**
 * The run's full manifest lookup: the static manifest map plus manifests of
 * tools activated at step level (`state.activatedStepTools`). Executors and
 * LLM-result pre-checks must resolve step-activated tools the same way — a
 * tool exposed only through `activatedStepTools` has no entry in the static
 * map, and reading the static map alone silently degrades a pre-check to the
 * wrong branch.
 */
export const selectEffectiveToolManifestMap = (
  state: Partial<ToolSetCarrier>,
): Record<string, any> => {
  const staticMap = selectToolManifestMap(state);
  const activated = state.activatedStepTools ?? [];
  if (activated.length === 0) return staticMap;
  return {
    ...staticMap,
    ...Object.fromEntries(
      activated
        .filter((activation) => activation.manifest)
        .map((activation) => [activation.id, activation.manifest!]),
    ),
  };
};

export const selectToolSourceMap = (
  state: Partial<ToolSetCarrier>,
): NonNullable<AgentState['toolSourceMap']> =>
  state.operationToolSet?.sourceMap ?? state.toolSourceMap ?? {};
