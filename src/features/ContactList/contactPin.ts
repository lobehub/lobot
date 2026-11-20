import type { SidebarAgentItem } from '@lobot/types';

/**
 * Whether a Contacts row offers Pin. Contacts pins the Agent itself: in a workspace that orders
 * every member's list, so for a shared Agent only owners and admins may (the server checks the
 * same). A private Agent's pin is its creator's own. A person pins a conversation in Messages instead.
 */
export const canPinContact = ({
  canManageTeamPins,
  inWorkspace,
  visibility,
}: {
  canManageTeamPins: boolean;
  inWorkspace: boolean;
  visibility?: SidebarAgentItem['visibility'];
}) => !inWorkspace || visibility === 'private' || canManageTeamPins;
