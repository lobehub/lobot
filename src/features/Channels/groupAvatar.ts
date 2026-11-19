/**
 * The face a thread line connects to. A continuation has no avatar of its own, so the line
 * walks back through the same author's grouped rows to the one that does.
 */
export const groupAvatar = (row: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = row;
  while (current) {
    const face = current.querySelector('[data-message-avatar]');
    if (face instanceof HTMLElement) return face;
    if (!current.hasAttribute('data-continuation')) return null;
    const previous: Element | null = current.previousElementSibling;
    current =
      previous instanceof HTMLElement && previous.getAttribute('role') === 'article'
        ? previous
        : null;
  }
  return null;
};
