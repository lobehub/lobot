/**
 * Pi RPC transport — `pi --mode rpc` JSONL client + per-run session wrapper.
 *
 * Replaces the legacy one-shot `--mode json` spawn for the desktop pi path:
 * a long-lived bidirectional process with command/response correlation, the
 * extension UI sub-protocol, and graceful EOF-based shutdown.
 */
export {
  createPiRpcAgentHandle,
  type PiRpcAgentHandle,
  type PiRpcAgentHandleOptions,
  type PiRpcStartupControl,
  toPiRpcPrompt,
} from './piRpcAgentHandle';
