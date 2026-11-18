// The row is a link: a click fires on pointerup after a drag, so swallow the
// one click that follows a drop instead of navigating to the dragged row.
export const suppressNextClick = () => {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  // A drop that lands off the row produces no click; don't eat a later one.
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
};
