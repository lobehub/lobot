import { existsSync } from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

import * as electronIs from '@/utils/platform';
import { windowsAppUserModelId } from '@/utils/windowsAppUserModelId';

/**
 * Windows binds the toast notifier to the process AppUserModelID the first
 * time `Notification` is touched. With nothing set, Electron invents
 * `electron.app.<ProductName>`, which is not the Start menu shortcut
 * electron-builder stamps (`appId`). Toasts are then created and dropped.
 * This has to happen before `ready`, and before any `Notification` call.
 * Dev uses a separate id so the SDK binary cannot take over the installed shortcut.
 */
if (process.platform === 'win32') {
  app.setAppUserModelId(windowsAppUserModelId(process.env.DESKTOP_APP_ID));
}

// Must run BEFORE any module captures `app.getPath('userData')` (e.g. `@/const/dir`
// reads it at top level). Once a path is read, `setName` / `setPath` no-op for it.
//
// Dev now uses the same `app://renderer/` origin as prod, so localStorage / cookies /
// IndexedDB would collide if both shared the packaged-app's userData dir. Pin dev to
// a sibling directory so prod sessions stay clean.
if (electronIs.dev()) {
  // App name stays constant so safeStorage / Chromium cookie encryption keys
  // (OS-keychain entries derived from the app name) keep decrypting a copied
  // login state across instances. Only userData varies per instance, which is
  // enough: Electron's single-instance lock is keyed by the userData dir, so
  // distinct dirs let multiple dev instances run concurrently. Override with an
  // absolute path via LOBE_DESKTOP_USER_DATA_DIR for multi-instance testing.
  app.setName('lobot-dev');
  const userDataOverride = process.env.LOBE_DESKTOP_USER_DATA_DIR;
  app.setPath('userData', userDataOverride || path.join(app.getPath('appData'), 'lobot-dev'));
  // A launcher-managed instance with a test-account profile (`scripts/devInstance.mts`,
  // `mockKeychain`) encrypts tokens and cookies with Chromium's fixed mock key
  // instead of the macOS keychain. The keychain grants access per binary, and the
  // dev Electron is ad-hoc signed and installed once per checkout, so every
  // checkout would ask for the login password again. The fixed key is public, so
  // a profile holding a production login keeps the keychain.
  if (
    userDataOverride &&
    process.env.LOBE_DESKTOP_MOCK_KEYCHAIN === '1' &&
    process.platform === 'darwin'
  )
    app.commandLine.appendSwitch('use-mock-keychain');
}

// HarmonyOS PC (OpenHarmony Electron port) shims.
//
// 1. The emulator ships no GPU stack — Chromium's GPU process crash-loops on
//    the missing `libiGraphicsCore.z.so` and every window stays blank — so it
//    has to render in software. A real 2in1 has the library, so probe for it
//    rather than disabling acceleration everywhere.
// 2. `child_process` can be imported but calling it aborts the process
//    natively (SIGABRT, not a throwable error). The HAP sandbox forbids
//    spawning anyway, so replace the entry points with inert stubs that
//    report the failure instead of killing the app.
if (process.platform === 'openharmony') {
  const hasGpuStack = ['/system/lib64/libiGraphicsCore.z.so'].some((library) => {
    try {
      return existsSync(library);
    } catch {
      return false;
    }
  });

  // `LOBOT_HARMONY_SOFTWARE_GL=1` forces the software path: the escape hatch for
  // a device whose GPU stack is present but still cannot drive Chromium.
  if (!hasGpuStack || process.env.LOBOT_HARMONY_SOFTWARE_GL === '1') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
  }

  // The port reports the primary input as a touch pointer with no hover. This
  // switch only moves the start-up default: once a window exists the platform
  // re-reports its real devices, and on a 2in1 the touchscreen in that list
  // wins again. It still helps for pages rendered before any window reports
  // input; the styles themselves are rewritten at build time, see
  // `plugins/vite/harmonyHoverMedia.ts`.
  app.commandLine.appendSwitch(
    'blink-settings',
    'primaryHoverType=1,availableHoverTypes=1,primaryPointerType=4,availablePointerTypes=4',
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const childProcess = require('node:child_process');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter } = require('node:events');
  const disabled = (name: string) => (...args: any[]) => {
    const target = typeof args[0] === 'string' ? args[0] : '';
    const reason = `child_process.${name}(${target.slice(0, 80)}) is not supported on HarmonyOS`;
    console.warn(`[harmony] ${reason}`);
    const emitter: any = new EventEmitter();
    emitter.pid = -1;
    emitter.kill = () => {};
    emitter.stdout = new EventEmitter();
    emitter.stderr = new EventEmitter();
    emitter.stdin = { end() {}, write() {} };
    // Fail fast: callers that promisify / pass a callback must settle instead of
    // waiting forever, otherwise the app keeps a window spinning on a promise
    // that can never resolve.
    const callback = args.find((arg: any) => typeof arg === 'function');
    setImmediate(() => {
      const error: any = new Error(reason);
      error.code = 'ENOSYS';
      try {
        if (callback) callback(error, '', '');
      } catch {}
      if (emitter.listenerCount('error') > 0) emitter.emit('error', error);
      emitter.emit('close', 127, null);
      emitter.emit('exit', 127, null);
    });
    return emitter;
  };
  for (const name of ['exec', 'execFile', 'fork', 'spawn']) childProcess[name] = disabled(name);
  // The packaged build silences electron-log's console transport, which makes
  // the main process a black box on this port. Force it on so hilog shows what
  // the app is doing.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const harmonyLog = require('electron-log');
    if (harmonyLog?.transports?.console) harmonyLog.transports.console.level = 'debug';
  } catch {}

  // `powerSaveBlocker.start()` aborts the process natively on this port. Keep
  // the API shape but never touch the underlying implementation.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { powerSaveBlocker } = require('electron');
    powerSaveBlocker.start = () => {
      console.warn('[harmony] powerSaveBlocker.start skipped: unsupported on HarmonyOS');
      return -1;
    };
    powerSaveBlocker.stop = () => true;
    powerSaveBlocker.isStarted = () => false;
  } catch (error) {
    console.warn('[harmony] failed to shim powerSaveBlocker:', error);
  }

  // Login-item registration is a macOS/Windows concept; the port throws.
  try {
    const originalSetLoginItem = app.setLoginItemSettings?.bind(app);
    if (originalSetLoginItem) {
      (app as any).setLoginItemSettings = (...args: any[]) => {
        console.warn('[harmony] app.setLoginItemSettings skipped');
        return undefined;
      };
      void originalSetLoginItem;
    }
  } catch {}

  // Renderer console is otherwise invisible on this port; mirror it into the
  // main log so load failures can be diagnosed from hilog.
  app.on('browser-window-created', (_event, window) => {
    window.webContents.on('console-message', (_e: any, level: any, message: any) => {
      console.warn(`[renderer:${level}] ${String(message).slice(0, 400)}`);
    });
    window.webContents.on('did-fail-load', (_e: any, code: any, desc: any, url: any) => {
      console.warn(`[renderer] did-fail-load ${code} ${desc} ${url}`);
    });
  });

  // Trace IPC so a native abort can be attributed to the channel that caused it.
  // Opt-in: it logs every channel twice per call, which is only worth it while
  // chasing a crash. `LOBOT_HARMONY_TRACE=1` turns it on.
  if (process.env.LOBOT_HARMONY_TRACE) {
    const { ipcMain: harmonyIpcMain } = require('electron');
    const wrap = (fn: any, label: string) =>
      function (this: any, channel: string, listener: any) {
        console.warn(`[ipc] ${label} ${channel}`);
        const traced = (event: any, ...args: any[]) => {
          console.warn(`[ipc] > ${channel}`);
          try {
            const result = listener(event, ...args);
            if (result && typeof result.then === 'function') {
              return result.then(
                (v: any) => { console.warn(`[ipc] < ${channel}`); return v; },
                (e: any) => { console.warn(`[ipc] x ${channel}: ${e && e.message}`); throw e; },
              );
            }
            console.warn(`[ipc] < ${channel}`);
            return result;
          } catch (e: any) {
            console.warn(`[ipc] x ${channel}: ${e && e.message}`);
            throw e;
          }
        };
        return fn.call(this, channel, traced);
      };
    harmonyIpcMain.handle = wrap(harmonyIpcMain.handle, 'handle');
    harmonyIpcMain.on = wrap(harmonyIpcMain.on, 'on');
  }

  for (const name of ['execSync', 'execFileSync', 'spawnSync']) {
    childProcess[name] = (target: any) => {
      console.warn(`[harmony] child_process.${name}(${String(target).slice(0, 80)}) skipped: unsupported on HarmonyOS`);
      return { status: 1, stderr: '', stdout: '' };
    };
  }
}

if (globalThis.__SHELL__) Object.freeze(globalThis.__SHELL__);
