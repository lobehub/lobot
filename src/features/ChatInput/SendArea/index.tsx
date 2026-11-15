import { Flexbox } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { memo, useMemo } from 'react';

import { type ActionKey } from '../ActionBar/config';
import { actionMap } from '../ActionBar/config';
import { useChatInputResourceAccess } from '../hooks/useChatInputResourceAccess';
import { useChatInputStore } from '../store';
import { resolveSendAreaActionKeys } from './resolveActionKeys';
import SendButton from './SendButton';

const mapActionsToItems = (keys: ActionKey[]) =>
  keys.map((actionKey) => {
    const Render = actionMap[actionKey];
    return <Render key={actionKey} />;
  });

const SendArea = memo(() => {
  const { canShowControls } = useChatInputResourceAccess();
  const rightActions = useChatInputStore((s) => s.rightActions, isEqual);
  const activeAudioInputMode = useChatInputStore((s) => s.activeAudioInputMode);
  const audioInputActive = activeAudioInputMode !== undefined;

  const items = useMemo(
    () =>
      canShowControls
        ? mapActionsToItems(
            resolveSendAreaActionKeys(rightActions as ActionKey[], activeAudioInputMode),
          )
        : [],
    [activeAudioInputMode, canShowControls, rightActions],
  );

  return (
    /** The model label must yield space before the footer clips Send on narrow panels. */
    <Flexbox horizontal align={'center'} flex={'0 1 auto'} gap={12} style={{ minWidth: 0 }}>
      {items}
      {!audioInputActive && <SendButton />}
    </Flexbox>
  );
});

SendArea.displayName = 'SendArea';

export default SendArea;
