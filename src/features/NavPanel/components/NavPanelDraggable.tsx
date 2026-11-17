'use client';

import { createStaticStyles, cssVar, cx, DraggablePanel } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { Activity, memo, Suspense, useMemo, useRef } from 'react';

import NavPanelUpgradeEntry from '@/business/client/features/NavPanelUpgradeEntry';
import { isDesktop } from '@/const/version';
import { MAC_VIBRANCY_BACKGROUND } from '@/features/Electron/system/macWindowFullscreen';
import Footer from '@/features/HomeSidebar/Footer';
import { USER_DROPDOWN_ICON_ID } from '@/features/NavPanel/constants';
import { TOGGLE_BUTTON_ID } from '@/features/NavPanel/ToggleLeftPanelButton';
import NavTabBar from '@/features/NavRail';
import { LIST_COLUMN_BACKGROUND } from '@/features/NavRail/const';
import { useImLayout } from '@/features/NavRail/useImLayout';
import { useGlobalStore } from '@/store/global';
import {
  NAV_PANEL_MAX_WIDTH,
  NAV_PANEL_MIN_WIDTH,
  systemStatusSelectors,
} from '@/store/global/selectors';
import { isMacOS } from '@/utils/platform';

import { useNavPanelSizeChangeHandler } from '../hooks/useNavPanel';
import { BACK_BUTTON_ID } from './BackButton';

const draggableStyles = createStaticStyles(({ css, cssVar }) => ({
  // `im_layout`: the list column inside the wrap, divided from the content.
  imPanel: css`
    border-inline-end: 1px solid ${cssVar.colorBorderSecondary};
    background: ${LIST_COLUMN_BACKGROUND};
  `,
  // Detached sections (Settings): the list column is its own rounded card on the
  // window background, mirroring the wrap it replaces.
  detachedPanel: css`
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 12px;
    box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  `,
  // Compact window: the list column fills the wrap; there is nothing beside it to divide from.
  compactPanel: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  `,
  content: css`
    position: relative;

    overflow: hidden;
    display: flex;
    flex-direction: column;

    height: 100%;
    min-height: 100%;
    max-height: 100%;
  `,
  inner: css`
    position: relative;

    overflow: hidden;
    flex: 1;

    min-width: 240px;
    max-width: 100%;
    min-height: 0;
  `,
  layer: css`
    position: absolute;
    inset: 0;

    overflow: hidden;
    display: flex;
    flex-direction: column;

    min-width: 240px;
    max-width: 100%;
    min-height: 100%;
    max-height: 100%;
  `,
  panel: css`
    user-select: none;
    height: 100%;
    color: ${cssVar.colorTextSecondary};
    background: ${isDesktop && isMacOS() ? MAC_VIBRANCY_BACKGROUND : cssVar.colorBgLayout};

    * {
      user-select: none;
    }

    #${TOGGLE_BUTTON_ID} {
      width: 0 !important;
      opacity: 0;
      transition:
        opacity,
        width 0.2s ${cssVar.motionEaseOut};
    }

    #${USER_DROPDOWN_ICON_ID} {
      width: 0 !important;
      opacity: 0;
      transition:
        opacity,
        width 0.2s ${cssVar.motionEaseOut};
    }
    #${BACK_BUTTON_ID} {
      width: 24px !important;
    }

    &:hover {
      #${TOGGLE_BUTTON_ID} {
        width: 32px !important;
        opacity: 1;
      }

      #${USER_DROPDOWN_ICON_ID} {
        width: 14px !important;
        opacity: 1;
      }
    }
  `,
}));

interface NavPanelDraggableProps {
  activeContent: {
    key: string;
    node: ReactNode;
  };
  /** Compact window: fill the wrap instead of a resizable column. */
  compact?: boolean;
  /** Compact window on a content page: keep the list mounted but off screen. */
  compactHidden?: boolean;
  detached?: boolean;
  homeContent?: ReactNode;
}

const classNames = {
  content: draggableStyles.content,
};

const hiddenLayerStyle = { display: 'none' };

export const NavPanelDraggable = memo<NavPanelDraggableProps>(
  ({ activeContent, compact, compactHidden, detached, homeContent }) => {
    const [expand, togglePanel, isStatusInit] = useGlobalStore((s) => [
      systemStatusSelectors.showLeftPanel(s),
      s.toggleLeftPanel,
      systemStatusSelectors.isStatusInit(s),
    ]);
    const handleSizeChange = useNavPanelSizeChangeHandler();

    // Defer DraggablePanel mount until system status hydrates; otherwise defaultSize
    // captures the pre-hydration default and the DOM drifts off NavigationBar's live width.
    const defaultWidthRef = useRef(0);
    if (defaultWidthRef.current === 0 && isStatusInit) {
      defaultWidthRef.current = systemStatusSelectors.leftPanelWidth(useGlobalStore.getState());
    }

    const imLayout = useImLayout();
    const styles = useMemo(
      () => ({
        background: imLayout
          ? LIST_COLUMN_BACKGROUND
          : isDesktop && isMacOS()
            ? MAC_VIBRANCY_BACKGROUND
            : cssVar.colorBgLayout,
        zIndex: 11,
      }),
      [imLayout],
    );

    const isHomeActive = activeContent.key === 'home';

    const body = (
      <>
        <div className={draggableStyles.inner}>
          {/* Home stays mounted while a route-owned panel is active so its list
            state survives the round trip. Activity keeps the fibers but not the
            visibility, so the layer is force-hidden like HomeLayout does. */}
          {homeContent && (
            <Activity mode={isHomeActive ? 'visible' : 'hidden'} name="NavPanelHome">
              <div
                className={draggableStyles.layer}
                style={isHomeActive ? undefined : hiddenLayerStyle}
              >
                {homeContent}
              </div>
            </Activity>
          )}
          {!isHomeActive && (
            <div className={draggableStyles.layer} key={activeContent.key}>
              {activeContent.node}
            </div>
          )}
        </div>
        <Suspense fallback={null}>
          <NavPanelUpgradeEntry />
        </Suspense>
        {/* The tab bar owns navigation, settings and help under `im_layout`. */}
        {imLayout ? (
          <NavTabBar />
        ) : (
          <Suspense>
            <Footer />
          </Suspense>
        )}
      </>
    );

    // A compact window has no room to resize the column: it is either the whole wrap or hidden.
    if (compact) {
      return (
        <div
          style={compactHidden ? hiddenLayerStyle : styles}
          className={cx(
            draggableStyles.panel,
            draggableStyles.compactPanel,
            draggableStyles.content,
            detached && draggableStyles.detachedPanel,
          )}
        >
          {body}
        </div>
      );
    }

    if (defaultWidthRef.current === 0) {
      const pendingWidth = systemStatusSelectors.leftPanelWidth(useGlobalStore.getState());
      return <div aria-hidden style={{ flexShrink: 0, height: '100%', width: pendingWidth }} />;
    }

    const defaultSize = { height: '100%', width: defaultWidthRef.current };

    return (
      <DraggablePanel
        classNames={classNames}
        defaultSize={defaultSize}
        expand={expand}
        expandable={false}
        maxWidth={NAV_PANEL_MAX_WIDTH}
        minWidth={NAV_PANEL_MIN_WIDTH}
        placement="left"
        showBorder={false}
        style={styles}
        className={cx(
          draggableStyles.panel,
          imLayout && draggableStyles.imPanel,
          detached && draggableStyles.detachedPanel,
        )}
        onExpandChange={togglePanel}
        onSizeDragging={handleSizeChange}
      >
        {body}
      </DraggablePanel>
    );
  },
);
