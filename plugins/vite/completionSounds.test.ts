import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  renderCompletionSounds,
  viteCompletionSounds,
  writeCompletionSounds,
} from './completionSounds';

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('completion sounds', () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('renders the shipped default chime (an octave-down marimba) unchanged', () => {
    const { aiff, wavs } = renderCompletionSounds();
    expect(sha256(wavs['chat-complete'])).toBe(
      '00ba7b4a05fcc792228ae3d4b27459567d87c509df3f8fb71925865208157bef',
    );
    expect(sha256(aiff)).toBe('297808b9c0971b7147382de92710c813b50b4c545e80c9775f3d5e6740e7f4fc');
  });

  it('renders every built-in as a 24 kHz mono WAV under 100 KB', () => {
    const { wavs } = renderCompletionSounds();
    expect(Object.keys(wavs).sort()).toEqual([
      'chat-complete',
      'glass-bell',
      'soft-tone',
      'xylophone',
    ]);
    for (const wav of Object.values(wavs)) {
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wav.readUInt32LE(24)).toBe(24_000);
      expect(wav.readUInt16LE(22)).toBe(1);
      expect(wav.length).toBeLessThan(100 * 1024);
    }
  });

  it('writes into the public dir and the aiff dir, leaving unchanged files untouched', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'completion-sounds-'));
    directories.push(root);
    const publicDir = path.join(root, 'public');
    const aiffDir = path.join(root, 'resources', 'sounds');
    const plugin = viteCompletionSounds({ aiffDir });
    (plugin.configResolved as (config: { publicDir: string }) => void)({ publicDir });
    await (plugin.buildStart as () => Promise<void>)();

    expect((await readdir(path.join(publicDir, 'sounds'))).sort()).toEqual([
      'chat-complete.wav',
      'glass-bell.wav',
      'soft-tone.wav',
      'xylophone.wav',
    ]);
    const aiff = path.join(aiffDir, 'lobehub-complete.aiff');
    const before = (await stat(aiff)).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 20));
    await writeCompletionSounds({ aiffDir, wavDir: path.join(publicDir, 'sounds') });
    expect((await stat(aiff)).mtimeMs).toBe(before);
  });
});
