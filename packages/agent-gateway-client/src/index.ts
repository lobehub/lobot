export { AgentStreamClient } from './client';
export {
  createOperationClient,
  type OperationClient,
  type OperationClientEvents,
  type OperationClientOptions,
} from './mux/createOperationClient';
export { GatewayMuxClient } from './mux/GatewayMuxClient';
export type { MuxOpLifecycleMessage, ToolResultPayload } from './mux/types';
export { CLIENT_PROTOCOL_VERSION, isLlmRelayChannelId } from './protocol';
export { isSessionTerminalEvent } from './terminalEvent';
export type {
  AgentInterventionInteractionKind,
  AgentInterventionProvider,
  AgentInterventionRequestData,
  AgentInterventionResponseData,
  AgentStreamClientFeature,
  AgentStreamClientOptions,
  AgentStreamEvent,
  AgentStreamEventType,
  AgentStreamSessionCompletion,
  ConnectionStatus,
  MessagePatchData,
  StepCompleteData,
  StreamChunkData,
  StreamStartData,
  SubAgentProgressData,
  ToolEndData,
  ToolStartData,
  ToolStateChunkData,
} from './types';
