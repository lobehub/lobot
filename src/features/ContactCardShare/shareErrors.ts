/** Why the server refused an Agent's card, as the key of the message the sender reads. */
export const shareAgentErrorKey = (error: unknown) => {
  const code = (error as { data?: { code?: unknown } } | null | undefined)?.data?.code;
  // The sender's own Agent without a share link: sharing never publishes it by surprise.
  if (code === 'PRECONDITION_FAILED') return 'contactCard.error.agentNotShared' as const;
  // Someone else's Agent whose share was turned off, or that is gone.
  if (code === 'NOT_FOUND') return 'contactCard.error.unavailable' as const;
  return 'contactCard.error.failed' as const;
};

/** Why the server refused a person's card, as the key of the message the sender reads. */
export const shareUserErrorKey = (error: unknown) => {
  const code = (error as { data?: { code?: unknown } } | null | undefined)?.data?.code;
  // Only oneself, a contact or a fellow workspace member can be shared.
  if (code === 'FORBIDDEN') return 'contactCard.error.userNotShareable' as const;
  // An account that is gone.
  if (code === 'NOT_FOUND') return 'contactCard.error.userUnavailable' as const;
  return 'contactCard.error.failed' as const;
};
