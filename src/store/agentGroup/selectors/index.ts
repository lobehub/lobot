import { agentGroupByIdSelectors } from './byId';
import { currentSelectors } from './current';

export { agentGroupByIdSelectors } from './byId';

export const agentGroupSelectors = {
  ...currentSelectors,
  getGroupById: agentGroupByIdSelectors.groupById,
  getGroupMemberAvatars: agentGroupByIdSelectors.groupMemberAvatars,
  getGroupMembers: agentGroupByIdSelectors.groupMembers,
  getGroupMeta: agentGroupByIdSelectors.groupMeta,
};
