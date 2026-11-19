import { ContextMenuTrigger, cssVar, cx, type DropdownItem, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { Hash } from 'lucide-react';
import type { ReactNode } from 'react';

import { electronStylish } from '@/styles/electron';

import { styles } from './styles';
import { hasChannelHeaderMenuActions, useChannelHeaderMenuItems } from './useChannelHeaderMenu';

type TitleProps = {
  detail?: ChannelDetail;
  onToggleAgentPanel?: () => void;
  onToggleChannelSettings?: () => void;
  showHash?: boolean;
  title: ReactNode;
};

/** Bind interactions to the original hash and Text, never a padded title container. */
export function ChannelHeaderTitle(props: TitleProps) {
  return props.detail ? (
    <ManagedChannelHeaderTitle {...props} detail={props.detail} />
  ) : (
    <TitleContent showHash={props.showHash} title={props.title} />
  );
}

function ManagedChannelHeaderTitle({
  detail,
  onToggleAgentPanel,
  onToggleChannelSettings,
  showHash,
  title,
}: TitleProps & { detail: ChannelDetail }) {
  const items = useChannelHeaderMenuItems(detail, onToggleAgentPanel);
  const settingsKey = detail.channel.agentId ? 'agentSettings' : 'settings';
  const settingsItem = items.find((item) => item && 'key' in item && item.key === settingsKey);
  const onActivate = settingsItem
    ? detail.channel.agentId
      ? onToggleAgentPanel
      : onToggleChannelSettings
    : undefined;

  return (
    <TitleContent
      items={hasChannelHeaderMenuActions(items) ? items : undefined}
      showHash={showHash}
      title={title}
      // The item names what the click opens: a shared Agent's profile, not settings.
      label={
        onActivate &&
        settingsItem &&
        'label' in settingsItem &&
        typeof settingsItem.label === 'string'
          ? settingsItem.label
          : undefined
      }
      onActivate={onActivate}
    />
  );
}

function TitleContent({
  items,
  label,
  onActivate,
  showHash,
  title,
}: {
  items?: DropdownItem[];
  label?: string;
  onActivate?: () => void;
  showHash?: boolean;
  title: ReactNode;
}) {
  const interactive = stylex.props(onActivate && styles.headerTitleInteractive);
  const className = cx(interactive.className, electronStylish.nodrag);
  const hash = showHash ? (
    <Hash
      aria-hidden
      className={className}
      color={cssVar.colorTextDescription}
      size={16}
      onClick={
        onActivate
          ? (event) => {
              if (event.button === 0) onActivate();
            }
          : undefined
      }
    />
  ) : null;
  const name = (
    <Text
      ellipsis
      className={className}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
      title={label}
      weight={500}
      onClick={
        onActivate
          ? (event) => {
              if (event.button === 0) onActivate();
            }
          : undefined
      }
      onKeyDown={
        onActivate
          ? (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (!event.repeat) onActivate();
            }
          : undefined
      }
    >
      {title}
    </Text>
  );

  // ContextMenuTrigger clones its child; no wrapper or layout box is introduced.
  return (
    <>
      {hash && (items ? <ContextMenuTrigger items={items}>{hash}</ContextMenuTrigger> : hash)}
      {items ? <ContextMenuTrigger items={items}>{name}</ContextMenuTrigger> : name}
    </>
  );
}
