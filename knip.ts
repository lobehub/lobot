import type { KnipConfig } from 'knip';

/**
 * Lobot ships the Electron desktop app (main, preload, renderer and overlay
 * windows) from this repository; the embedded `lh` CLI is the published
 * `@lobehub/cli` bundle. Everything reachable from those entries is product
 * code; anything else is leftover from the LobeHub fork. Run in production mode so tests do not keep dead code alive:
 *
 *   bunx knip --production
 *
 * Platform variants are resolved by Vite plugins that knip does not model:
 * `plugins/vite/platformResolve.ts` swaps `foo.ts` for `foo.desktop.ts` or
 * `foo.vite.ts` in the renderer, and `plugins/vite/osPlatformResolve.ts` swaps
 * in `foo.mac.ts` / `foo.windows.ts` / `foo.linux.ts` in main and preload. They
 * are listed as entries so what they import stays reachable.
 */
const PLATFORM_VARIANTS = '**/*.{desktop,vite,mac,windows,linux}.{ts,tsx}!';

const config: KnipConfig = {
  // Workspace packages are internal source, not published libraries: report an
  // export of a package entry when no other workspace imports it.
  'includeEntryExports': true,
  // The Next.js shell and Vercel OG routes were removed with the web app.
  'next': false,
  'vercel-og': false,
  'workspaces': {
    '.': {
      entry: [
        // Renderer windows (index.html, overlay.html)
        'src/spa/entry.desktop.tsx!',
        'electron/overlay/entry.tsx!',
        // Preload scripts (vite.preload.config.ts)
        'electron/preload/index.ts!',
        'electron/preload/connectorOAuth.ts!',
        `{src,electron}/${PLATFORM_VARIANTS}`,
        // new Worker(new URL('./x.worker.ts', import.meta.url))
        'src/**/*.worker.ts!',
      ],
      project: ['{src,electron}/**/*.{ts,tsx}!'],
    },
    'electron/main': {
      entry: [
        'index.ts!',
        // Loaded by import.meta.glob in core/App.ts
        'controllers/*Ctr.ts!',
        'services/*Srv.ts!',
        // Loaded by dynamic import in locales/resources.ts
        'locales/default/*.ts!',
        PLATFORM_VARIANTS,
      ],
      project: ['**/*.ts!'],
    },
    'packages/*': {
      entry: [
        PLATFORM_VARIANTS,
        // Loaded by dynamic import in src/utils/i18n/loadI18nNamespaceModule*.ts
        'src/default/*.ts!',
      ],
      project: ['src/**/*.{ts,tsx}!'],
    },
    'packages/business/*': {
      project: ['src/**/*.{ts,tsx}!'],
    },
  },
};

export default config;
