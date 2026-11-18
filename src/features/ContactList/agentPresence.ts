import type { AgentAvailability, AgentAvailabilityStatus } from '@lobot/types';

/**
 * What an Agent is up to, as shown on its contact card. The server resolves it
 * the way Channel dispatch does (`agentAvailability.getAvailability`), so the
 * card shows what routing decides on; see `AgentAvailabilityStatus` for the
 * states and their order.
 */
export type AgentPresenceStatus = AgentAvailabilityStatus;

export type AgentPresence = Pick<AgentAvailability, 'resetsAt' | 'status'>;

/**
 * Statuses that only say "ready for work". Their chip is left out: the avatar
 * dot already says it, and a chip that pops in once presence loads shifts the
 * card's layout for no new information.
 */
const READY_STATUSES = new Set<AgentPresenceStatus>(['idle', 'online']);

export const hasPresenceLabel = (status: AgentPresenceStatus) => !READY_STATUSES.has(status);
