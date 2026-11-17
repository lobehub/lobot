import type {
  ClaudeCodeAccountResolution,
  ClaudeCodeLocalAccount,
  ClaudeCodeQuotaSnapshot,
  CodexQuotaSnapshot,
  CodexRateLimitResetResult,
  KimiCodeQuotaSnapshot,
} from '@lobechat/electron-client-ipc';
import type {
  HeterogeneousAgentModelCatalog,
  ListHeterogeneousAgentModelsParams,
} from '@lobot/types';

import { ensureElectronIpc } from '@/utils/electron/ipc';

/**
 * Renderer-side service for device-local heterogeneous agent reads (models, quota, Claude
 * Code logins) via Electron IPC. Runs themselves are dispatched through the gateway.
 */
class HeterogeneousAgentService {
  private get ipc() {
    return ensureElectronIpc();
  }

  async listModels(
    params: ListHeterogeneousAgentModelsParams,
  ): Promise<HeterogeneousAgentModelCatalog> {
    return this.ipc.heterogeneousAgent.listModels(params);
  }

  async getCodexQuota(params?: {
    command?: string;
    env?: Record<string, string>;
    force?: boolean;
  }): Promise<CodexQuotaSnapshot> {
    return this.ipc.heterogeneousAgent.getCodexQuota(params);
  }

  async consumeCodexRateLimitResetCredit(params: {
    command?: string;
    creditId?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<CodexRateLimitResetResult> {
    return this.ipc.heterogeneousAgent.consumeCodexRateLimitResetCredit(params);
  }

  async getClaudeCodeQuota(params?: {
    env?: Record<string, string>;
    force?: boolean;
  }): Promise<ClaudeCodeQuotaSnapshot> {
    return this.ipc.heterogeneousAgent.getClaudeCodeQuota(params);
  }

  async getKimiCodeQuota(params?: {
    env?: Record<string, string>;
    force?: boolean;
    kimiCodeHomePath?: string | null;
  }): Promise<KimiCodeQuotaSnapshot> {
    return this.ipc.heterogeneousAgent.getKimiCodeQuota(params);
  }

  /** Every Claude Code account signed in on this machine (default login first). */
  async listClaudeCodeAccounts(): Promise<ClaudeCodeLocalAccount[]> {
    return this.ipc.heterogeneousAgent.listClaudeCodeAccounts();
  }

  /** The local login a run for this provider account must spawn with. */
  async resolveClaudeCodeAccount(externalAccountId: string): Promise<ClaudeCodeAccountResolution> {
    return this.ipc.heterogeneousAgent.resolveClaudeCodeAccount({ externalAccountId });
  }

  /** Sign an account in to its own profile; resolves once the browser login completes. */
  async loginClaudeCodeAccount(params?: { email?: string }): Promise<ClaudeCodeLocalAccount> {
    return this.ipc.heterogeneousAgent.loginClaudeCodeAccount(params);
  }

  async cancelClaudeCodeAccountLogin(): Promise<boolean> {
    return this.ipc.heterogeneousAgent.cancelClaudeCodeAccountLogin();
  }
}

export const heterogeneousAgentService = new HeterogeneousAgentService();
