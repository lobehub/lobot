/**
 * LobeHub Skill Server connection status
 */
export enum LobehubSkillStatus {
  /** Connected and ready to use */
  CONNECTED = 'connected',
  /** Connecting */
  CONNECTING = 'connecting',
  /** Connection failed or token expired */
  ERROR = 'error',
  /** Not connected */
  NOT_CONNECTED = 'not_connected',
}

/**
 * LobeHub Skill Tool definition (from Market API)
 */
export interface LobehubSkillTool {
  /** Tool description */
  description?: string;
  /** JSON Schema for tool input */
  inputSchema: {
    additionalProperties?: boolean;
    properties?: Record<string, any>;
    required?: string[];
    type: string;
  };
  /** Tool name */
  name: string;
}

/**
 * LobeHub Skill Server instance (user-connected provider)
 */
export interface LobehubSkillServer {
  /** Cache timestamp */
  cachedAt?: number;
  /** Error message */
  errorMessage?: string;
  /** Provider icon URL */
  icon?: string;
  /** Provider ID (e.g., 'linear') */
  identifier: string;
  /** Whether authenticated */
  isConnected: boolean;
  /** Provider display name */
  name: string;
  /** Provider username (e.g., GitHub username) */
  providerUsername?: string;
  /** Authorized scopes */
  scopes?: string[];
  /** Connection status */
  status: LobehubSkillStatus;
  /** Token expiration time */
  tokenExpiresAt?: string;
  /** Tool list (available after connection) */
  tools?: LobehubSkillTool[];
}
