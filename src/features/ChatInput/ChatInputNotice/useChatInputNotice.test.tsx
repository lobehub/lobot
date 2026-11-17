import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatInputNotice, useChatInputNotices } from './useChatInputNotice';

const access = vi.hoisted(() => ({ canUseResource: true, isGroupContext: false }));

vi.mock('@/features/ChatInput/hooks/useChatInputResourceAccess', () => ({
  useChatInputResourceAccess: () => access,
}));

beforeEach(() => {
  access.canUseResource = true;
  access.isGroupContext = false;
});

describe('useChatInputNotices', () => {
  it('has no notice when the input can be used', () => {
    expect(renderHook(() => useChatInputNotices()).result.current).toEqual([]);
    expect(renderHook(() => useChatInputNotice()).result.current).toBeUndefined();
  });

  it('marks a view-only agent', () => {
    access.canUseResource = false;
    expect(renderHook(() => useChatInputNotice()).result.current).toEqual({
      key: 'input.viewOnlyAgent',
      type: 'warning',
    });
  });

  it('marks a view-only group', () => {
    access.canUseResource = false;
    access.isGroupContext = true;
    expect(renderHook(() => useChatInputNotice()).result.current?.key).toBe('input.viewOnlyGroup');
  });
});
