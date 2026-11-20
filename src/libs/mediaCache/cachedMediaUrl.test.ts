import { describe, expect, it, vi } from 'vitest';

import { cachedMediaUrl } from './cachedMediaUrl';

vi.mock('@lobechat/const', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isDesktop: true,
}));

const pathOf = (url: string | undefined) => {
  const parsed = new URL(url!);
  return { pathname: parsed.pathname, src: parsed.searchParams.get('src') };
};

describe('cachedMediaUrl', () => {
  it('keeps one disk path when a signed URL is refreshed, and still carries the source', () => {
    const first = 'https://s3.example.com/avatars/a.png?X-Amz-Signature=one&X-Amz-Expires=300';
    const second = 'https://s3.example.com/avatars/a.png?X-Amz-Signature=two&X-Amz-Expires=300';

    const firstUrl = cachedMediaUrl(first);
    const secondUrl = cachedMediaUrl(second);

    expect(pathOf(firstUrl).pathname).toMatch(/^\/[a-f0-9]{64}\//);
    expect(pathOf(secondUrl).pathname).toBe(pathOf(firstUrl).pathname);
    expect(pathOf(firstUrl).src).toBe(first);
    expect(pathOf(secondUrl).src).toBe(second);
  });

  it('keys an uploaded file by its id and carries the signed URL for a cache miss', () => {
    const first = cachedMediaUrl('https://s3.example.com/demo.mp4?X-Amz-Signature=a', {
      id: 'file_V',
      name: 'demo.mp4',
    });
    const second = cachedMediaUrl('https://s3.example.com/demo.mp4?X-Amz-Signature=b', {
      id: 'file_V',
      name: 'demo.mp4',
    });

    expect(pathOf(first).pathname).toBe('/file_V/demo.mp4');
    expect(pathOf(second).pathname).toBe('/file_V/demo.mp4');
    expect(pathOf(first).src).toContain('Signature=a');
    expect(pathOf(second).src).toContain('Signature=b');
  });

  it('leaves the file proxy, blob URLs, and an address that is already cached', () => {
    expect(cachedMediaUrl('https://app.lobehub.com/f/file_V')).toBe(
      'https://app.lobehub.com/f/file_V',
    );
    expect(cachedMediaUrl('blob:app://x/1')).toBe('blob:app://x/1');
    expect(cachedMediaUrl('lobe-file-cache://file/file_V/demo.mp4')).toBe(
      'lobe-file-cache://file/file_V/demo.mp4',
    );
  });
});
