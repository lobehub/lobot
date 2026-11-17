import { INBOX_SESSION_ID } from '@/const/session';
import { sessionHelpers } from '@/store/session/slices/session/helpers';
import {
  type CustomSessionGroup,
  type GroupMemberWithAgent,
  type LobeGroupSession,
  type LobeSession,
  type LobeSessions,
} from '@/types/session';

import { type SessionStore } from '../../../store';

const allSessions = (s: SessionStore): LobeSessions => s.sessions;

const currentSession = (s: SessionStore): LobeSession | undefined => {
  if (!s.activeId) return;

  return allSessions(s).find((i) => i.id === s.activeId);
};

const isCurrentSessionGroupSession = (s: SessionStore): boolean => {
  const session = currentSession(s);
  return session?.type === 'group';
};

const currentGroupAgents = (s: SessionStore): GroupMemberWithAgent[] => {
  const session = currentSession(s) as LobeGroupSession;

  if (session && session.type !== 'group') return [];

  return session ? (session.members ?? []) : [];
};

export const sessionSelectors = {
  currentGroupAgents,
  currentSession,
  isCurrentSessionGroupSession,
};
