import { cx, Flexbox } from '@lobehub/ui';
import { type FC, type PropsWithChildren } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { useIsDark } from '@/hooks/useIsDark';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';

import { getInnerCssVariables, getOuterCssVariables } from './cssVariables';
import { LayoutContainerContext } from './LayoutContainerContext';
import { styles } from './style';

const HIDDEN_STYLE = { display: 'none' } as const;

interface DesktopLayoutContainerProps extends PropsWithChildren {
  /**
   * Fill the parent edge to edge, with no outer padding or own border: the
   * `im_layout` rail wrap already draws the rounded border around it.
   */
  flush?: boolean;
  /** Keep the routed pages mounted but off screen (the compact window shows the list instead). */
  hidden?: boolean;
  /** No surface of its own: the routed page shows the window background (detached sections) */
  transparent?: boolean;
}

const DesktopLayoutContainer: FC<DesktopLayoutContainerProps> = ({
  children,
  flush,
  hidden,
  transparent,
}) => {
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useIsDark();
  const [expand] = useGlobalStore((s) => [systemStatusSelectors.showLeftPanel(s)]);

  const outerCssVariables = useMemo(() => getOuterCssVariables({ expand }), [expand]);

  const innerCssVariables = useMemo(
    () => getInnerCssVariables({ isDark: isDarkMode }),
    [isDarkMode],
  );

  // Toast viewport is portaled to body, so it can't inherit the container-scoped vars
  useEffect(() => {
    const vars: Record<string, string> = {
      '--toast-border-radius': innerCssVariables['--container-border-radius'],
      '--toast-viewport-offset-x': '24px',
      '--toast-viewport-offset-y': '24px',
    };
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    return () => {
      for (const key of Object.keys(vars)) root.style.removeProperty(key);
    };
  }, [innerCssVariables]);

  return (
    <Flexbox
      className={cx(styles.outerContainer, flush && styles.outerFlush)}
      height={'100%'}
      padding={flush ? 0 : 8}
      style={hidden ? HIDDEN_STYLE : flush ? undefined : outerCssVariables}
      width={'100%'}
    >
      <Flexbox
        height={'100%'}
        ref={innerContainerRef}
        style={innerCssVariables}
        width={'100%'}
        className={cx(
          styles.innerContainer,
          flush && styles.innerFlush,
          transparent && styles.innerTransparent,
        )}
      >
        <LayoutContainerContext value={innerContainerRef}>{children}</LayoutContainerContext>
      </Flexbox>
    </Flexbox>
  );
};
export default DesktopLayoutContainer;
