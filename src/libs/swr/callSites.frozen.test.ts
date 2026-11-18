import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * SWR call-site freeze.
 *
 * `keys.frozen.test.ts` only sees keys declared in `keys.ts`; an inline key
 * (`useClientDataSWR(['foo', id], …)`) in a component or feature hook bypasses
 * it. Server data the UI paints goes through `local-replica` (`@/libs/replica`,
 * see the `data-fetching-architecture` skill), so no file may start calling an
 * SWR hook, and this list only shrinks.
 *
 * - Your file is reported as new → read through a replica-backed store hook.
 * - You migrated a file off SWR → delete its entry here too.
 */
const LEGACY_SWR_CALL_SITES = [
  'src/business/client/workspace/store.ts',
  'src/features/AgentTransferMigration/useAgentTransferJob.ts',
  'src/features/ChatInput/ControlBar/SandboxDrivePicker.tsx',
  'src/features/ChatInput/ControlBar/useRepoType.ts',
  'src/features/ChatInput/ControlBar/useWorktreeHomeDir.ts',
  'src/features/ChatInput/InputEditor/LocalFileTag/LocalFileTag.tsx',
  'src/features/ChatInput/hooks/useLocalSandboxCapability.ts',
  'src/features/CommandMenu/useCommandMenu.ts',
  'src/features/DeviceManager/DeviceActivity/RunningUsers.tsx',
  'src/features/Electron/WorkspaceMentionNotifier/useWorkspaceMentionNotifier.ts',
  'src/features/Electron/connection/useGatewayKeepAwake.ts',
  'src/features/EntityLink/Render/InternalEntityLink.tsx',
  'src/features/EntityLink/Render/InternalEntityPreview.tsx',
  'src/features/EnvironmentManager/useGithubRepositories.ts',
  'src/features/Portal/LocalFile/MarkdownImage.tsx',
  'src/features/Settings/about/features/DebugLogs.tsx',
  'src/features/Settings/about/features/useRemoteDebuggingItem.tsx',
  'src/features/Settings/hotkey/features/AppMenu.tsx',
  'src/features/ShareModal/useExportMessages.ts',
  'src/features/Work/ShareVisitorDocumentModal/Content.tsx',
  'src/features/WorkingDirectory/EnvironmentSelect.tsx',
  'src/hooks/useGatewayReconnect.ts',
  'src/hooks/useOnboardingAgentTemplates.ts',
  'src/hooks/useScopedCreds.ts',
  'src/store/device/directoryHooks.ts',
  'src/store/electron/actions/app.ts',
  'src/store/electron/actions/gateway.ts',
  'src/store/electron/actions/settings.ts',
  'src/store/electron/actions/sync.ts',
  'src/store/global/actions/general.ts',
  'src/store/serverConfig/action.ts',
];

const ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['src', 'apps', 'packages'];
const SWR_CALL =
  /\b(?:useClientDataSWR|useClientPollingSWR|useOnlyFetchOnceSWR|useSWR|useSWRInfinite)\s*(?:<[^()]*>)?\(/;
// The SWR wrappers themselves, and the replica's SWR driver.
const EXEMPT = /^src\/libs\/(?:swr|replica)\//;
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', 'dist', '.next', 'build', 'out']);

const collect = (dir: string, files: string[]) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) collect(entryPath, files);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(?:test|spec)\.tsx?$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
};

const findCallSites = () => {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) collect(path.join(ROOT, dir), files);
  return files
    .map((file) => path.relative(ROOT, file).split('\\').join('/'))
    .filter((file) => !EXEMPT.test(file))
    .filter((file) => SWR_CALL.test(readFileSync(path.join(ROOT, file), 'utf8')))
    .sort();
};

describe('SWR call sites', () => {
  const callSites = findCallSites();

  it('adds no new SWR call site (use local-replica)', () => {
    const legacy = new Set(LEGACY_SWR_CALL_SITES);
    expect(callSites.filter((file) => !legacy.has(file))).toEqual([]);
  });

  it('drops migrated files from the legacy list', () => {
    const current = new Set(callSites);
    expect(LEGACY_SWR_CALL_SITES.filter((file) => !current.has(file))).toEqual([]);
  });
});
