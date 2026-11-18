export interface PendingOverlayDispatch {
  agentId: string;
  captureIds: string[];
  dispatchId: string;
  modelId?: string;
  prompt: string;
  provider?: string;
}
