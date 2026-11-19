#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const appRoot = path.join(import.meta.dirname, '..');
const hooksPath = '.githooks';
const log = (message) => console.log(`[prepare] ${message}`);

const runGit = (args) =>
  spawnSync('git', args, {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

const revParse = runGit(['rev-parse', '--git-dir']);

if (revParse.error) {
  log('git not available, skipping hooksPath setup');
  process.exit(0);
}

if (revParse.status !== 0) {
  log('not a git repository, skipping hooksPath setup');
  process.exit(0);
}

const config = runGit(['config', 'core.hooksPath', hooksPath]);

if (config.error || config.status !== 0) {
  const detail =
    (config.error && config.error.message) ||
    config.stderr ||
    config.stdout ||
    `exit ${config.status}`;
  console.error(`[prepare] failed to set core.hooksPath to ${hooksPath}: ${String(detail).trim()}`);
  process.exit(config.status || 1);
}
