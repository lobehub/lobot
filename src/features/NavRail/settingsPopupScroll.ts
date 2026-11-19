/**
 * The settings popup content scroller is `@lobehub/ui` ScrollArea's viewport
 * (Base UI `ScrollArea.Viewport`), obtained via `viewportProps.ref`.
 * The Root wrapper and guessed Radix `data-*` selectors are not the
 * scrollable node.
 */
export const resetSettingsPopupViewport = (
  viewport: HTMLElement | null,
  { hash, open }: { hash?: string | null; open: boolean },
) => {
  if (!open || hash || !viewport) return;
  viewport.scrollTop = 0;
};
