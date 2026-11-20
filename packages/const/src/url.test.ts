import { describe, expect, it } from 'vitest';

import {
  CHANNEL_URL,
  FEEDBACK,
  GITHUB,
  GITHUB_ISSUES,
  isOfficialCloudServer,
  RELEASES_URL,
} from './url';

describe('isOfficialCloudServer', () => {
  it.each([
    'https://app.lobehub.com',
    'https://lobehub.com',
    'https://lobehub.com/workspace',
    'https://staging.app.lobehub.com/',
  ])('treats %s as official', (url) => {
    expect(isOfficialCloudServer(url)).toBe(true);
  });

  it.each([
    'https://lobehub.com.evil.example',
    'https://notlobehub.com',
    'https://my-lobehub.internal',
    'http://localhost:3210',
    'not a url',
    '',
    undefined,
  ])('treats %s as self-hosted', (url) => {
    expect(isOfficialCloudServer(url)).toBe(false);
  });
});

describe('GitHub links', () => {
  it('point to the lobehub repository', () => {
    expect(GITHUB).toBe('https://github.com/lobehub/lobehub');
    expect(GITHUB_ISSUES).toBe('https://github.com/lobehub/lobehub/issues/new/choose');
    expect(FEEDBACK).toBe('https://github.com/lobehub/lobehub/issues/new/choose');
    expect(RELEASES_URL).toBe('https://github.com/lobehub/lobehub/releases');
  });
});

describe('CHANNEL_URL', () => {
  it('builds the channel and thread paths', () => {
    expect(CHANNEL_URL('chn_1')).toBe('/channels/chn_1');
    expect(CHANNEL_URL('chn_1', 'cht_1')).toBe('/channels/chn_1?thread=cht_1&view=page');
  });

  it('points a notification at one message, in the main conversation or a thread', () => {
    expect(CHANNEL_URL('chn_1', null, { id: 'msg_9', sequence: 12 })).toBe(
      '/channels/chn_1?message=msg_9&sequence=12',
    );
    expect(CHANNEL_URL('chn_1', 'cht_1', { id: 'msg_9', sequence: 12 })).toBe(
      '/channels/chn_1?thread=cht_1&view=page&message=msg_9&sequence=12',
    );
  });
});
