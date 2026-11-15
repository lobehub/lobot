import { Flexbox } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { memo } from 'react';

import ChatInputCredits from '@/business/client/features/ChatInputCredits';
import { useBusinessAgentModeSync } from '@/business/client/hooks/useBusinessAgentMode';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';

import { useAgentId } from '../hooks/useAgentId';
import { useChatInputResourceAccess } from '../hooks/useChatInputResourceAccess';
import { useEffectiveAgentMode } from '../hooks/useEffectiveAgentMode';
import ApprovalMode from './ApprovalMode';
import { resolveControlBarView } from './resolveControlBarView';
import WorkspaceControls from './WorkspaceControls';

const styles = stylex.create({
  // `flex: none` keeps the row at 28px inside the column-flex composer; without
  // it the bar shrinks to the compact chips' min-content height.
  bar: { flex: 'none', height: '28px', paddingBlock: '0', paddingInline: '4px' },
  // Left cluster (device + working directory + git) is the variable-width
  // part. It shrinks first and, once its long labels have truncated as far as
  // they can, scrolls horizontally instead of wrapping each chip's text. The
  // scrollbar is hidden — trackpad / wheel still works.
  leftGroup: {
    'scrollbarWidth': 'none',
    'overflowX': 'auto',
    'overflowY': 'hidden',
    'flex': '1',
    'minWidth': '0',
    '::-webkit-scrollbar': { display: 'none' },
  },
  // Right cluster (approval mode + context window) stays pinned and intact.
  rightGroup: { flex: 'none' },
});

/**
 * Same-height stand-in for the control bar (the 28px row), so the composer does
 * not move when the real controls replace it.
 */
export const ControlBarSkeleton = () => (
  <Flexbox
    aria-busy
    horizontal
    align={'center'}
    className={stylex.props(styles.bar).className}
    justify={'space-between'}
  >
    <div />
  </Flexbox>
);

const ControlBar = memo(() => {
  const agentId = useAgentId();
  // The Agent/Chat switch lives in the advanced params panel now; the bar stays
  // mounted with the composer, so it keeps the business mode sync alive.
  useBusinessAgentModeSync(agentId);
  const { canShowControls, isAccessLoading } = useChatInputResourceAccess();

  const isLoading = useAgentStore((s) => agentByIdSelectors.isAgentConfigLoadingById(agentId)(s));
  const { isAgentRuntimeMode, isPreferenceLoading } = useEffectiveAgentMode(agentId);

  const view = resolveControlBarView({
    agentId,
    canShowControls,
    isAccessLoading,
    isAgentConfigLoading: isLoading,
    isPreferenceLoading,
  });

  if (view === 'hidden') return null;
  if (view === 'skeleton') return <ControlBarSkeleton />;

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={stylex.props(styles.bar).className}
      justify={'space-between'}
    >
      {/* Left: (agent-only) execution device + working directory */}
      <Flexbox
        horizontal
        align={'center'}
        className={stylex.props(styles.leftGroup).className}
        gap={4}
      >
        {isAgentRuntimeMode && <WorkspaceControls agentId={agentId} />}
      </Flexbox>

      <Flexbox
        horizontal
        align={'center'}
        className={stylex.props(styles.rightGroup).className}
        gap={4}
      >
        <ChatInputCredits />
        {isAgentRuntimeMode && <ApprovalMode />}
      </Flexbox>
    </Flexbox>
  );
});

ControlBar.displayName = 'ControlBar';

export default ControlBar;
