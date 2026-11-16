import type { AgentEvent } from './event';
import type { AgentInstruction, AgentRuntimeContext } from './instruction';
import type { AgentState } from './state';

interface InstructionExecutionResult {
  events: AgentEvent[];
  newState: AgentState;
  /** Next context to pass to Agent runner (if execution should continue) */
  nextContext?: AgentRuntimeContext;
}

export type InstructionExecutor = (
  instruction: AgentInstruction,
  state: AgentState,
  /**
   * Runtime context for this step
   * Contains stepContext with dynamic state like lobe-agent todos
   */
  context?: AgentRuntimeContext,
) => Promise<InstructionExecutionResult>;
