/**
 * The description under the display name: the account id as `@username`.
 */
export const formatAccountUserId = (signedIn: boolean, username?: string | null): string => {
  if (!signedIn || !username) return '';
  return `@${username}`;
};
