export interface NavHeaderLeadingInput {
  /** The window is compact: it shows the list or this page, never both, so no panel toggle. */
  compact?: boolean;
  /** A compact window is showing this page instead of the list it was opened from. */
  compactBack?: boolean;
  /** The desktop left panel is open (the toggle is then redundant). */
  expand: boolean;
  /** macOS Electron, where the toggle lives in the titlebar. */
  isMacDesktop: boolean;
  /** The mobile SPA bundle, which has no left panel. */
  mobile: boolean;
  /** The header was given no left / right / center content. */
  noContent: boolean;
  showTogglePanelButton: boolean;
}

/**
 * What a `NavHeader` puts before its own content:
 * - `hidden`: render no header at all,
 * - `mobile`: back button + the route sidebar drawer,
 * - `back`: back to the list column, in a compact window that shows one at a time,
 * - `toggle`: the desktop left panel toggle,
 * - `none`: nothing extra.
 */
export type NavHeaderLeading = 'back' | 'hidden' | 'mobile' | 'none' | 'toggle';

export const getNavHeaderLeading = ({
  compact,
  compactBack,
  expand,
  isMacDesktop,
  mobile,
  noContent,
  showTogglePanelButton,
}: NavHeaderLeadingInput): NavHeaderLeading => {
  if (mobile) {
    // A full-screen mobile page always needs a way back; a panel header that
    // opts out of the toggle and has nothing to show stays hidden.
    if (!showTogglePanelButton) return noContent ? 'hidden' : 'none';
    return 'mobile';
  }

  // The list is off screen, so a page header is the only way back to it. Panel headers and
  // pages with their own back button opt out through `showTogglePanelButton`.
  if (compact) {
    if (compactBack && showTogglePanelButton) return 'back';
    return noContent ? 'hidden' : 'none';
  }

  // When empty, the header only exists to host the collapse toggle: hide it
  // while the panel is open and on macOS desktop, where the toggle is in the titlebar.
  if (noContent && (expand || isMacDesktop)) return 'hidden';
  return showTogglePanelButton && !expand ? 'toggle' : 'none';
};
