import type { ChannelListItem } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { buildShareTargets, filterShareTargets } from './shareTargets';

const channel = (overrides: Partial<ChannelListItem>) =>
  ({
    agentId: null,
    createdAt: new Date('2026-11-01'),
    id: 'chn',
    memberAvatars: [],
    projectId: null,
    status: 'active',
    title: 'Channel',
    ...overrides,
  }) as ChannelListItem;

describe('buildShareTargets', () => {
  const targets = buildShareTargets(
    [
      channel({ id: 'chn_old', title: 'Design', updatedAt: new Date('2026-11-02') }),
      channel({
        id: 'chn_peer',
        memberAvatars: [
          { actorType: 'user', avatar: 'a.png', backgroundColor: null, id: 'u', name: 'Ann' },
        ],
        peerUserId: 'user_ann',
        title: 'Stored title',
        updatedAt: new Date('2026-11-05'),
      }),
      channel({ id: 'chn_project', projectId: 'prj_1', title: 'General' }),
      channel({ id: 'chn_archived', status: 'archived', title: 'Old' }),
      channel({ agentId: 'agt_shared', id: 'chn_direct', title: 'Writer' }),
    ],
    (projectId) => (projectId === 'prj_1' ? 'Launch' : undefined),
    'agt_shared',
  );

  it('lists open conversations by latest activity, named as the list names them', () => {
    expect(targets.map((target) => [target.channel.id, target.name, target.kind])).toEqual([
      ['chn_peer', 'Ann', 'user'],
      ['chn_old', 'Design', 'group'],
      ['chn_project', 'Launch', 'group'],
    ]);
  });

  it('leaves out the conversation with the shared Agent itself', () => {
    expect(targets.some((target) => target.channel.id === 'chn_direct')).toBe(false);
  });

  it('filters by name', () => {
    expect(filterShareTargets(targets, 'lau').map((target) => target.channel.id)).toEqual([
      'chn_project',
    ]);
  });
});
