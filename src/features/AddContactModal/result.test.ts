import { describe, expect, it } from 'vitest';

import { personName, searchResultKey, searchResultName } from './result';

const owner = { avatar: null, fullName: 'Bob', id: 'u_bob', username: 'bob' };

describe('contact search results', () => {
  it('names a person by full name, then handle', () => {
    expect(personName({ fullName: '  ', username: 'bob' })).toBe('bob');
    expect(personName({ fullName: 'Bob B', username: 'bob' })).toBe('Bob B');
    expect(personName({ fullName: null, username: null }, 'Someone')).toBe('Someone');
  });

  it('names and keys an Agent apart from a person', () => {
    const agent = {
      agent: {
        agentId: 'agt_1',
        avatar: null,
        backgroundColor: null,
        description: null,
        owner,
        shareId: 's1',
        slug: null,
        title: null,
      },
      relation: 'none' as const,
      type: 'agent' as const,
    };
    expect(searchResultName(agent, 'Untitled')).toBe('Untitled');
    expect(searchResultKey(agent)).toBe('agent:agt_1');
    expect(searchResultKey({ relation: 'none', type: 'user', user: owner })).toBe('user:u_bob');
  });
});
