import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type {
  ClaudeCodeQuotaSnapshot,
  CodexQuotaSnapshot,
  CodexRateLimitResetResult,
  KimiCodeQuotaSnapshot,
} from '@lobechat/electron-client-ipc';
import type {
  HeteroExecImageRef,
  HeterogeneousAgentCancellationResult,
  HeterogeneousAgentCancellationSignal,
} from '@lobechat/heterogeneous-agents/protocol';
import { buildHeteroExecStdinPayload } from '@lobechat/heterogeneous-agents/protocol';
// Static on purpose: the lazily loaded quota sampler also pulls these modules in, and a separate
// dynamic import of the `quota` barrel splits them across chunks, which panics Rolldown's
// development build of the main process.
import { CLAUDE_CODE_EXTERNAL_ROUTING_ENV_KEYS } from '@lobechat/heterogeneous-agents/quota';
import type * as QuotaSamplerModule from '@lobechat/heterogeneous-agents/quota-sampler';
import type { QuotaSnapshotCache } from '@lobechat/heterogeneous-agents/quota-sampler';
import {
  isSpawnableDirectory,
  resolveHeteroSpawnCwd,
} from '@lobechat/heterogeneous-agents/workingDirectory';
import type {
  HeterogeneousAgentModelCatalog,
  ListHeterogeneousAgentModelsParams,
} from '@lobot/types';
import { managedProcessEnvironment, spawnManaged } from '@lobechat/utils/managedProcess';
import { sleep } from '@lobechat/utils/sleep';
import { app as electronApp } from 'electron';

import { HETERO_AGENT_TRACING_DIR } from '@/const/heteroAgent';
import { detectHeterogeneousCliCommand } from '@/modules/binaries';
import { resolveCliScript } from '@/modules/cliEmbedding';
import type { ClaudeCodeAccountProfiles } from '@/modules/heterogeneousAgent/claudeCodeAccounts';
import type * as CodexQuota from '@/modules/heterogeneousAgent/codexQuota';
import { buildInheritedSpawnEnv } from '@/modules/heterogeneousAgent/inheritedSpawnEnv';
import type * as KimiCodeQuota from '@/modules/heterogeneousAgent/kimiCodeQuota';
import { buildLhHeteroExecEnv } from '@/modules/heterogeneousAgent/lhHeteroExecEnv';
import { buildProxyEnv } from '@/modules/networkProxy/envBuilder';
import { createLogger } from '@/utils/logger';

import { ControllerModule, IpcMethod } from './index';

const logger = createLogger('controllers:HeterogeneousAgentCtr');

/** Dev-run trace root, relative to the run's working directory. */
const CLI_TRACE_DIR = '.heerogeneous-tracing';

interface GetCodexQuotaParams {
  command?: string;
  env?: Record<string, string>;
  force?: boolean;
}

interface ConsumeCodexRateLimitResetCreditParams {
  command?: string;
  creditId?: string;
  env?: Record<string, string>;
  idempotencyKey: string;
}

interface GetClaudeCodeQuotaParams {
  env?: Record<string, string>;
  force?: boolean;
}

interface GetKimiCodeQuotaParams {
  env?: Record<string, string>;
  force?: boolean;
  kimiCodeHomePath?: string | null;
}

export interface SpawnLhHeteroExecParams {
  /** Account-routing env (`CLAUDE_CONFIG_DIR` of the routed login), if any. */
  accountEnv?: Record<string, string>;
  agentId?: string;
  agentType: string;
  /** Resolved `lh hetero exec` wrapper args. */
  args?: string[];
  assistantMessageId?: string;
  cwd?: string;
  /** Image attachments (signed URLs) appended as image content blocks. */
  imageList?: HeteroExecImageRef[];
  jwt: string;
  /**
   * Called once the child process has spawned (pid available). The caller
   * (gateway dispatcher) uses this to register the process so a later
   * `cancelHeteroTask` can kill it by operationId.
   */
  onChildSpawned?: (child: ChildProcess) => void;
  operationId: string;
  prompt: string;
  resumeFallbackSystemContext?: string;
  resumeSessionId?: string;
  serverUrl: string;
  systemContext?: string;
  topicId: string;
  /** Topic/run workspace — forwarded as `LOBEHUB_WORKSPACE_ID` for ingest. */
  workspaceId?: string;
}

export type LhHeteroExecCancellationResult = HeterogeneousAgentCancellationResult;

interface LhHeteroExecTask {
  cancellation?: Promise<LhHeteroExecCancellationResult>;
  exit: Promise<void>;
  process: ChildProcess;
}

type QuotaSampler = typeof QuotaSamplerModule;
type CodexQuotaModule = typeof CodexQuota;
type KimiCodeQuotaModule = typeof KimiCodeQuota;

/** Quota samplers and their snapshot caches, loaded together on the first quota read. */
interface QuotaRuntime {
  claudeCodeQuotaCache: QuotaSnapshotCache<ClaudeCodeQuotaSnapshot>;
  codex: CodexQuotaModule;
  codexQuotaCache: QuotaSnapshotCache<CodexQuotaSnapshot>;
  kimiCode: KimiCodeQuotaModule;
  kimiCodeQuotaCache: QuotaSnapshotCache<KimiCodeQuotaSnapshot>;
  sampler: QuotaSampler;
}

/**
 * Desktop host for heterogeneous agents (Claude Code, Codex, …).
 *
 * Lobot never runs these CLIs in-process: a gateway-dispatched run spawns the
 * embedded `lh hetero exec`, which owns the agent process, its stream and the
 * server ingest. This controller only starts / cancels that wrapper and serves
 * the device-local reads the renderer needs (model catalog, subscription
 * quota, Claude Code logins). Quota samplers and the model catalog are loaded
 * on first use so application startup does not evaluate them.
 */
export default class HeterogeneousAgentCtr extends ControllerModule {
  static override readonly groupName = 'heterogeneousAgent';

  /** Device-gateway CLI wrappers keyed by their server operation id. */
  private lhHeteroExecTasks = new Map<string, LhHeteroExecTask>();
  private quotaRuntimePromise?: Promise<QuotaRuntime>;
  private claudeCodeAccountsPromise?: Promise<ClaudeCodeAccountProfiles>;

  private getQuotaRuntime = (): Promise<QuotaRuntime> => {
    this.quotaRuntimePromise ??= Promise.all([
      import('@lobechat/heterogeneous-agents/quota-sampler'),
      import('@/modules/heterogeneousAgent/codexQuota'),
      import('@/modules/heterogeneousAgent/kimiCodeQuota'),
    ])
      .then(([sampler, codex, kimiCode]) => ({
        // Fresh window sits under the renderer's 2-minute auto-refresh so each
        // scheduled poll reaches the usage API instead of a cache echo.
        claudeCodeQuotaCache: new sampler.QuotaSnapshotCache<ClaudeCodeQuotaSnapshot>({
          freshMs: sampler.CLAUDE_CODE_QUOTA_FRESH_MS,
        }),
        codex,
        codexQuotaCache: new sampler.QuotaSnapshotCache<CodexQuotaSnapshot>(),
        kimiCode,
        kimiCodeQuotaCache: new sampler.QuotaSnapshotCache<KimiCodeQuotaSnapshot>({
          freshMs: sampler.KIMI_CODE_QUOTA_FRESH_MS,
        }),
        sampler,
      }))
      .catch((error) => {
        this.quotaRuntimePromise = undefined;
        throw error;
      });

    return this.quotaRuntimePromise;
  };

  /** Local Claude Code logins (default + per-account profiles), loaded on first use. */
  private getClaudeCodeAccounts = (): Promise<ClaudeCodeAccountProfiles> => {
    this.claudeCodeAccountsPromise ??= import('@/modules/heterogeneousAgent/claudeCodeAccountsHost')
      .then(({ createClaudeCodeAccountProfiles }) =>
        createClaudeCodeAccountProfiles(this.app, () => buildInheritedSpawnEnv()),
      )
      .catch((error) => {
        this.claudeCodeAccountsPromise = undefined;
        throw error;
      });

    return this.claudeCodeAccountsPromise;
  };

  private get proxyEnv() {
    return buildProxyEnv(this.app.storeManager.get('networkProxy'));
  }

  /** Query a heterogeneous CLI's model catalog using the same env rules as a device run. */
  @IpcMethod()
  async listModels(
    params: ListHeterogeneousAgentModelsParams,
  ): Promise<HeterogeneousAgentModelCatalog> {
    const { listHeterogeneousAgentModels } = await import('@lobechat/heterogeneous-agents/models');
    const env = {
      ...buildInheritedSpawnEnv(),
      ...this.proxyEnv,
      ...params.env,
    };

    return listHeterogeneousAgentModels({
      ...params,
      cwd: params.cwd || electronApp.getPath('desktop'),
      env,
    });
  }

  /** Resolve the `codex` binary (and its login-shell PATH) a quota RPC must run. */
  private async resolveCodexQuotaSource(params: {
    command?: string;
    env?: Record<string, string>;
  }) {
    const command = params.command?.trim() || 'codex';
    const sourceEnv = { ...this.proxyEnv, ...params.env };
    const status = await detectHeterogeneousCliCommand('codex', command);
    const env = {
      ...(status.resolvedPathEnv ? { PATH: status.resolvedPathEnv } : {}),
      ...sourceEnv,
    };

    return {
      command,
      requestOptions: {
        command: status.available && status.path ? status.path : command,
        env: Object.keys(env).length > 0 ? env : undefined,
      },
      sourceEnv,
    };
  }

  @IpcMethod()
  async getCodexQuota(params: GetCodexQuotaParams = {}): Promise<CodexQuotaSnapshot> {
    const { codex, codexQuotaCache, sampler } = await this.getQuotaRuntime();
    const command = params.command?.trim() || 'codex';
    const sourceKey = sampler.createQuotaCacheKey('codex', command, {
      ...this.proxyEnv,
      ...params.env,
    });

    return codexQuotaCache.get(
      sourceKey,
      async () => {
        const { requestOptions } = await this.resolveCodexQuotaSource(params);
        return codex.fetchCodexQuota(requestOptions);
      },
      { force: params.force },
    );
  }

  /**
   * Redeem one earned Codex rate-limit reset, then bypass the quota cache so
   * every renderer receives the post-reset windows and remaining inventory.
   */
  @IpcMethod()
  async consumeCodexRateLimitResetCredit(
    params: ConsumeCodexRateLimitResetCreditParams,
  ): Promise<CodexRateLimitResetResult> {
    const { codex, codexQuotaCache, sampler } = await this.getQuotaRuntime();
    const { command, requestOptions, sourceEnv } = await this.resolveCodexQuotaSource(params);
    const sourceKey = sampler.createQuotaCacheKey('codex', command, sourceEnv);

    const outcome = await codex.consumeCodexRateLimitResetCredit({
      ...requestOptions,
      creditId: params.creditId,
      idempotencyKey: params.idempotencyKey,
    });
    codexQuotaCache.invalidate(sourceKey);
    const quota = await codexQuotaCache.get(
      sourceKey,
      () => codex.fetchCodexQuota(requestOptions),
      { force: true },
    );

    return { outcome, quota };
  }

  /**
   * Read the Claude Code subscription quota. No CLI is spawned: the quota
   * comes from Anthropic's OAuth usage API using the local `claude` login,
   * and the request goes through the app's global proxy dispatcher.
   */
  @IpcMethod()
  async getClaudeCodeQuota(
    params: GetClaudeCodeQuotaParams = {},
  ): Promise<ClaudeCodeQuotaSnapshot> {
    const { claudeCodeQuotaCache, sampler } = await this.getQuotaRuntime();
    const sourceKey = sampler.createQuotaCacheKey('claude-code', params.env);

    return claudeCodeQuotaCache.get(
      sourceKey,
      () => sampler.fetchClaudeCodeQuota({ env: params.env }),
      { force: params.force },
    );
  }

  /**
   * Read the Kimi Code subscription quota. No CLI is spawned: the quota comes
   * from the Kimi usage API using the local `kimi` login, and the request goes
   * through the app's global proxy dispatcher.
   */
  @IpcMethod()
  async getKimiCodeQuota(params: GetKimiCodeQuotaParams = {}): Promise<KimiCodeQuotaSnapshot> {
    const { kimiCode, kimiCodeQuotaCache, sampler } = await this.getQuotaRuntime();
    const sourceKey = sampler.createQuotaCacheKey('kimi-code', params.env, params.kimiCodeHomePath);

    return kimiCodeQuotaCache.get(
      sourceKey,
      () =>
        kimiCode.fetchKimiCodeQuota({
          env: params.env,
          kimiCodeHomePath: params.kimiCodeHomePath,
        }),
      { force: params.force },
    );
  }

  /** Every Claude Code account signed in on this machine, and where its login lives. */
  @IpcMethod()
  async listClaudeCodeAccounts() {
    return (await this.getClaudeCodeAccounts()).list();
  }

  /** The local login a run for this provider account must spawn with. */
  @IpcMethod()
  async resolveClaudeCodeAccount(params: { externalAccountId: string }) {
    return (await this.getClaudeCodeAccounts()).resolve(params.externalAccountId);
  }

  /** Sign an account in to its own profile; resolves once the browser login lands. */
  @IpcMethod()
  async loginClaudeCodeAccount(params: { email?: string } = {}) {
    return (await this.getClaudeCodeAccounts()).login(params);
  }

  @IpcMethod()
  async cancelClaudeCodeAccountLogin() {
    return (await this.getClaudeCodeAccounts()).cancelLogin();
  }

  /**
   * External-provider routing flags (`CLAUDE_CODE_USE_BEDROCK` …) a device run
   * inherits from this desktop's process env. Those flags take the run off the
   * subscription login, so gateway account routing has to see them.
   */
  async getClaudeCodeInheritedRoutingEnv(): Promise<Record<string, string>> {
    const inherited = buildInheritedSpawnEnv();
    const flags: Record<string, string> = {};
    for (const key of CLAUDE_CODE_EXTERNAL_ROUTING_ENV_KEYS) {
      const value = inherited[key];
      if (value !== undefined) flags[key] = value;
    }
    return flags;
  }

  private get shouldTraceCliOutput(): boolean {
    if (process.env.NODE_ENV === 'test') return false;
    // Dev builds always trace. Packaged builds trace only when the user has
    // flipped the Help-menu developer toggle — so production issues can be
    // captured on demand without polluting normal runs.
    if (!electronApp.isPackaged) return true;
    return this.app.storeManager.get('heteroTracingEnabled', false);
  }

  /**
   * Root directory for CLI raw dumps.
   *
   * With the `heteroTracingEnabled` Help-menu toggle on, traces go under the
   * app storage dir (`<appStoragePath>/heteroAgent/tracing`) — the only path
   * packaged builds trace through, reachable from one Help-menu entry.
   * Otherwise (a plain dev run) they land in `cwd/.heerogeneous-tracing`.
   */
  private resolveTraceRootDir(cwd: string): string {
    if (this.app.storeManager.get('heteroTracingEnabled', false)) {
      return path.join(this.app.appStoragePath, HETERO_AGENT_TRACING_DIR);
    }
    return path.join(cwd, CLI_TRACE_DIR);
  }

  /**
   * Spawn the embedded CLI's `hetero exec` for gateway-driven agent runs.
   * The bundled CLI handles everything downstream. Mirrors
   * `spawnHeteroSandbox()` on the server side.
   *
   * Resolves only after the child either starts or fails to start. Node reports
   * failures such as an inaccessible cwd asynchronously through `error`, so an
   * eager accepted ack would strand the server operation without a producer.
   */
  spawnLhHeteroExec(
    params: SpawnLhHeteroExecParams,
  ): Promise<{ reason?: string; status: 'accepted' | 'rejected' }> {
    const {
      agentType,
      args: extraArgs,
      cwd,
      imageList,
      operationId,
      onChildSpawned,
      prompt,
      resumeFallbackSystemContext,
      resumeSessionId,
      systemContext,
      topicId,
    } = params;
    const workDir = cwd ?? process.cwd();
    // Let the embedded CLI classify a stale project path and finish the
    // operation through heteroFinish instead of failing this wrapper spawn as
    // the misleading `spawn LobeHub.exe ENOENT`.
    const workDirUsable = isSpawnableDirectory(workDir);
    const spawnCwd = resolveHeteroSpawnCwd(workDir);

    // When CLI tracing is enabled (dev builds, or the Help-menu toggle in
    // packaged builds), have `lh hetero exec` persist the agent process's RAW
    // stream-json (pre-adapter) on this device; otherwise a device run leaves
    // no local record. Do not pass a cwd-relative dump path for a missing
    // workDir: RawStreamDump would recreate the deleted directory before
    // spawnAgent can report it.
    const rawDumpDir =
      this.shouldTraceCliOutput && workDirUsable ? this.resolveTraceRootDir(workDir) : undefined;

    const args = [
      'hetero',
      'exec',
      '--type',
      agentType,
      '--operation-id',
      operationId,
      '--topic',
      topicId,
      '--render',
      'none',
      '--input-json',
      '-',
      '--cwd',
      workDir,
      ...(resumeSessionId ? ['--resume', resumeSessionId] : []),
      ...(rawDumpDir ? ['--raw-dump', rawDumpDir] : []),
      ...(extraArgs ?? []),
    ];

    const stdinPayload = buildHeteroExecStdinPayload({
      imageList,
      isNewSession: !resumeSessionId,
      prompt,
      resumeFallbackSystemContext,
      systemContext,
    });
    const cliScript = resolveCliScript();
    if (!existsSync(cliScript)) {
      return Promise.resolve({
        reason: `Embedded CLI not found at ${cliScript}`,
        status: 'rejected',
      });
    }

    const env = buildLhHeteroExecEnv({ ...params, proxyEnv: this.proxyEnv });

    logger.info('spawnLhHeteroExec: type=%s op=%s topic=%s', agentType, operationId, topicId);

    // Execute the CLI shipped with this desktop build. A bare `lh` would prefer
    // an older global install earlier on PATH, letting model discovery report a
    // capability that the actual execution runtime does not support.
    // `detached: true` puts the CLI in its own process group so
    // `killPlatformProcessTree(-pid, signal)` reaches the CLI and its children;
    // the inherited-group env contract prevents the inner agent from detaching
    // into a second, unreachable group.
    const child = spawnManaged(process.execPath, [cliScript, ...args], {
      cwd: spawnCwd,
      detached: true,
      env: {
        ...env,
        ...managedProcessEnvironment({ topicId, agentId: params.agentId, label: agentType }),
      },
      stdio: ['pipe', 'inherit', 'inherit'],
      windowsHide: true,
    });

    // Keep the wrapper reachable by the gateway cancellation tool. Its pid is
    // also the inherited process-group id shared by the native agent and tool
    // descendants, so the gateway can confirm the complete writer tree exited
    // before a replacement turn starts.
    const exit = new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
      child.once('error', () => resolve());
    });
    this.lhHeteroExecTasks.set(operationId, { exit, process: child });

    const forget = () => {
      if (this.lhHeteroExecTasks.get(operationId)?.process === child) {
        this.lhHeteroExecTasks.delete(operationId);
      }
    };
    child.on('exit', (code, signal) => {
      logger.info('spawnLhHeteroExec: exited — op=%s code=%s signal=%s', operationId, code, signal);
      forget();
    });
    child.on('error', forget);

    return new Promise((resolve) => {
      let settled = false;
      const settle = (result: { reason?: string; status: 'accepted' | 'rejected' }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      child.stdin.once('error', (err) => {
        logger.error(
          'spawnLhHeteroExec: stdin write failed — op=%s error=%s',
          operationId,
          err.message,
        );
        settle({ reason: err.message, status: 'rejected' });
      });

      child.once('spawn', () => {
        // Register the child with the gateway's platform task registry so a
        // later `cancelHeteroTask` (the user clicking Stop in the web UI) can
        // find and kill this process by operationId.
        onChildSpawned?.(child);
        try {
          child.stdin.write(stdinPayload);
          child.stdin.end();
          settle({ status: 'accepted' });
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          logger.error(
            'spawnLhHeteroExec: stdin write threw — op=%s error=%s',
            operationId,
            reason,
          );
          settle({ reason, status: 'rejected' });
        }
      });

      child.once('error', (err) => {
        logger.error('spawnLhHeteroExec: spawn failed — %s', err.message);
        settle({ reason: err.message, status: 'rejected' });
      });
    });
  }

  /**
   * Cancels a device-gateway `lh hetero exec` wrapper and waits for its native
   * writer to exit.
   *
   * Use when:
   * - A server operation is interrupted from another client.
   * - A replacement turn must not resume the same native thread concurrently.
   *
   * Expects:
   * - `operationId` is the id supplied to {@link spawnLhHeteroExec}.
   *
   * Returns:
   * - Process details when a live wrapper was found; otherwise `undefined`.
   */
  async cancelLhHeteroExec(params: {
    operationId: string;
    signal?: HeterogeneousAgentCancellationSignal;
  }): Promise<LhHeteroExecCancellationResult | undefined> {
    const { operationId, signal = 'SIGINT' } = params;
    const task = this.lhHeteroExecTasks.get(operationId);
    if (!task) return;
    if (task.cancellation) return task.cancellation;

    task.cancellation = (async () => {
      this.killProcessTree(task.process, signal);
      let exited = await this.waitForProcessTreeExit(task, 2000);

      if (!exited) {
        // The wrapper and native agent inherit one detached group. Escalate that
        // complete group instead of relying on a second wrapper-only SIGINT.
        this.killProcessTree(task.process, 'SIGKILL');
        exited = await this.waitForProcessTreeExit(task, 3000);
      }

      return { exited, pid: task.process.pid, signal };
    })();

    return task.cancellation;
  }

  /**
   * Signal the whole process tree of a wrapper.
   *
   * On Unix the child was spawned with `detached: true`, so negating the pid
   * signals the process group — reaching tool subprocesses that would
   * otherwise orphan after a parent-only kill. Falls back to the direct signal
   * if the group kill raises (ESRCH when the leader is already gone). On
   * Windows we shell out to `taskkill /T /F` which walks the tree.
   */
  private killProcessTree(proc: ChildProcess, signal: NodeJS.Signals): void {
    if (!proc.pid || proc.killed) return;

    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch (err) {
        logger.warn('taskkill failed:', err);
      }
      return;
    }

    try {
      process.kill(-proc.pid, signal);
    } catch {
      try {
        proc.kill(signal);
      } catch {
        // already exited
      }
    }
  }

  private isProcessGroupAlive(pid: number): boolean {
    try {
      process.kill(-pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== 'ESRCH';
    }
  }

  private async waitForProcessTreeExit(
    task: LhHeteroExecTask,
    timeoutMs: number,
  ): Promise<boolean> {
    if (process.platform === 'win32') {
      let timer: NodeJS.Timeout | undefined;
      const timedOut = new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      });
      const exited = await Promise.race([task.exit.then(() => true as const), timedOut]);
      if (timer) clearTimeout(timer);
      return exited;
    }
    if (!task.process.pid) return true;

    const deadline = Date.now() + timeoutMs;
    while (this.isProcessGroupAlive(task.process.pid)) {
      if (Date.now() >= deadline) return false;
      await sleep(50);
    }

    return true;
  }
}
