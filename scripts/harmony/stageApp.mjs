/**
 * Stage the Electron app for a HarmonyOS PC HAP.
 *
 * Huawei's Electron port runs the app from
 * `web_engine/src/main/resources/resfile/resources/app` in its HAP project
 * (https://gitcode.com/openharmony-sig/electron). It cannot compile anything on
 * the device and loads no `.node` addon built for another OS, so the staged
 * directory holds only built JavaScript:
 *
 *   package.json   name / productName / version, `main` → harmony-main.js
 *   harmony-main.js
 *   dist/{main,preload,renderer}
 *   resources/     same subset as the desktop core (assembleCore)
 *   node_modules/  the pure-JS modules the main bundle requires at runtime
 *
 * There is no shell and no core OTA: AppGallery ships every update.
 *
 * Build first with the HarmonyOS variants:
 *   npm_config_platform=openharmony npm run build:main:raw
 * then: node scripts/harmony/stageApp.mjs [--out=dir]
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDependenciesForModules } from '../../module-deps.config.mjs';

const DESKTOP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Same exclusions as assembleCore: build-only art and per-OS helper binaries. */
const RESOURCES_EXCLUDED = new Set(['bin', 'cli-package.json', 'dmg.png', 'locales']);

/**
 * Externals the main bundle `require`s that must exist next to it. Native
 * addons are deliberately absent: the `.harmony.ts` variants never load them,
 * and `font-list` has a variant too.
 */
export const HARMONY_RUNTIME_MODULES = ['electron-log'];

/**
 * Bare requires left in the main bundle that are never satisfied on HarmonyOS,
 * and why that is safe. Anything else must be staged or bundled.
 */
const UNSTAGED_REQUIRES = {
  '@lydell/node-pty': 'remote terminal loads it on demand; the call fails, startup does not',
  'ajv': 'inside code ajv generates as a string, not a module load',
  'ajv-formats': 'inside code ajv generates as a string, not a module load',
  'bufferutil': 'optional ws speedup, required inside try/catch',
  'node-mac-permissions': 'required only on macOS',
  'utf-8-validate': 'optional ws speedup, required inside try/catch',
};

/** Package names of `require("x")` calls in a bundle, minus Node and Electron built-ins. */
export const findBareRequires = (code) => {
  const found = new Set();
  for (const [, id] of code.matchAll(/\brequire\("([^"`]+)"\)/g)) {
    if (id.startsWith('.') || id === 'electron' || id.startsWith('electron/')) continue;
    if (id.startsWith('node:') || builtinModules.includes(id.split('/')[0])) continue;
    found.add(id.startsWith('@') ? id.split('/').slice(0, 2).join('/') : id.split('/')[0]);
  }
  return found;
};

const listJsFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(dir, file));

export function stageHarmonyApp({ desktopDir = DESKTOP_DIR, out } = {}) {
  const outDir = out ?? path.join(desktopDir, 'harmony-app');
  const dist = path.join(desktopDir, 'dist');
  const missing = ['main', 'preload', 'renderer'].filter((d) => !existsSync(path.join(dist, d)));
  if (missing.length)
    throw new Error(`stageHarmonyApp: build dist/${missing.join(', dist/')} first`);

  const unmet = new Set();
  for (const file of listJsFiles(path.join(dist, 'main'))) {
    for (const id of findBareRequires(readFileSync(file, 'utf8'))) {
      if (!HARMONY_RUNTIME_MODULES.includes(id) && !(id in UNSTAGED_REQUIRES)) unmet.add(id);
    }
  }
  if (unmet.size) {
    throw new Error(
      `stageHarmonyApp: dist/main requires ${[...unmet].join(', ')}, which a HAP would not ship. ` +
        'Was it built with npm_config_platform=openharmony?',
    );
  }

  const pkg = JSON.parse(readFileSync(path.join(desktopDir, 'package.json'), 'utf8'));

  rmSync(outDir, { force: true, recursive: true });
  const copy = (from, to, filter) =>
    cpSync(from, path.join(outDir, to), { dereference: true, filter, recursive: true });

  for (const dir of ['main', 'preload', 'renderer']) copy(path.join(dist, dir), `dist/${dir}`);

  const resources = path.join(desktopDir, 'resources');
  copy(
    resources,
    'resources',
    (src) => !RESOURCES_EXCLUDED.has(path.relative(resources, src).split(path.sep)[0]),
  );

  const modules = getDependenciesForModules(HARMONY_RUNTIME_MODULES);
  for (const name of modules) {
    copy(path.join(desktopDir, 'node_modules', name), `node_modules/${name}`);
  }

  writeFileSync(
    path.join(outDir, 'harmony-main.js'),
    [
      '// HarmonyOS HAP entry. No shell and no core OTA: the store ships every update.',
      "require('./dist/main/index.js');",
      '',
    ].join('\n'),
  );
  writeFileSync(
    path.join(outDir, 'package.json'),
    `${JSON.stringify(
      {
        main: 'harmony-main.js',
        name: pkg.name,
        productName: process.env.DESKTOP_PRODUCT_NAME || 'Lobot',
        type: 'commonjs',
        version: pkg.version,
      },
      null,
      2,
    )}\n`,
  );

  return { modules, outDir };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outArg = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
  const { modules, outDir } = stageHarmonyApp(outArg ? { out: path.resolve(outArg) } : {});
  console.log(`HarmonyOS app staged at ${outDir} (node_modules: ${modules.join(', ') || 'none'})`);
}
