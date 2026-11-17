import type { AiProviderRuntimeConfig, HeterogeneousProviderApiConfig } from '@lobot/types';

import type { LocalHeterogeneousAgentType } from '../config';

export type HeterogeneousProviderBindingProtocol =
  'anthropic-messages' | 'google-generative-ai' | 'openai-chat-completions' | 'openai-responses';

export interface HeterogeneousProviderBindingCapability {
  agentType: LocalHeterogeneousAgentType;
  protocols: readonly HeterogeneousProviderBindingProtocol[];
}

export interface HeterogeneousProviderBindingResolution {
  agentType: LocalHeterogeneousAgentType;
  apiConfig: HeterogeneousProviderApiConfig;
  /** Credential-free endpoint used by the target CLI. */
  endpoint?: string;
  modelMetadata?: EnabledProviderBindingModelRef;
  protocol: HeterogeneousProviderBindingProtocol;
  providerId: string;
  runtimeConfig: AiProviderRuntimeConfig;
}

export type HeterogeneousProviderBindingError =
  | { agentType: string; code: 'agentUnsupported' }
  | { code: 'configMissing' }
  | { code: 'credentialUnsupported'; providerId: string }
  | { code: 'credentialsMissing'; providerId: string }
  | { code: 'endpointMissing'; providerId: string }
  | { code: 'endpointUnsupported'; providerId: string }
  | { code: 'modelUnavailable'; model: string; providerId: string }
  | { agentType: string; code: 'protocolMismatch'; providerId: string }
  | { code: 'providerUnavailable'; providerId: string };

interface EnabledProviderBindingModelRef {
  abilities?: {
    reasoning?: boolean;
    vision?: boolean;
  };
  contextWindowTokens?: number;
  displayName?: string;
  id: string;
  maxOutput?: number;
  providerId: string;
  type: string;
}

export interface ResolveHeterogeneousProviderBindingInput {
  agentType: string;
  apiConfig?: HeterogeneousProviderApiConfig;
  /** Check decrypted credentials. Keep false in renderer/UI and true in Desktop main. */
  checkCredentials?: boolean;
  enabledModels?: readonly EnabledProviderBindingModelRef[];
  providerEnabled: boolean;
  runtimeConfig?: AiProviderRuntimeConfig;
}

export type ResolveHeterogeneousProviderBindingResult =
  | { error: HeterogeneousProviderBindingError; resolution?: never }
  | { error?: never; resolution: HeterogeneousProviderBindingResolution };
