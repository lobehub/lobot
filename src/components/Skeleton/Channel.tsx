'use client';

import { Flexbox, Skeleton } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

import SkeletonBar from './Bar';

/** Name width and body line widths per row, so the feed reads as a few distinct speakers. */
const MESSAGE_ROWS = [
  { lines: ['72%'], name: 96 },
  { lines: ['88%', '54%'], name: 72 },
  { lines: ['64%'], name: 120 },
  { lines: ['80%', '36%'], name: 88 },
];

const styles = stylex.create({
  // `ChatInput`'s container border and fill, so the real composer paints over the same box.
  composer: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: cssVar.colorFill,
    borderRadius: cssVar.borderRadiusLG,
    backgroundColor: cssVar.colorBgElevated,
    backgroundImage: 'none',
    boxShadow: cssVar.boxShadowTertiary,
  },
  root: {
    overflow: 'hidden',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
  },
});

/**
 * One `ChannelMessage` row: the 36px avatar pinned left, then the name and time
 * header over the body lines, indented 48px like `ChatItem` in the feed.
 */
const MessageRowSkeleton = ({ lines, name }: (typeof MESSAGE_ROWS)[number]) => (
  <Flexbox horizontal gap={12} paddingBlock={8}>
    <Skeleton.Avatar shape={'circle'} size={36} />
    <Flexbox flex={1} gap={10} paddingBlock={'4px 0'} style={{ minWidth: 0 }}>
      <Flexbox horizontal align={'center'} gap={8}>
        <SkeletonBar height={14} width={name} />
        <SkeletonBar height={12} width={40} />
      </Flexbox>
      {lines.map((width, index) => (
        <SkeletonBar height={14} key={index} width={width} />
      ))}
    </Flexbox>
  </Flexbox>
);

/** Snippet line widths per search hit, so the rows don't read as one repeated block. */
const SEARCH_HIT_ROWS = [
  { lines: ['92%', '64%'], name: 72 },
  { lines: ['78%'], name: 96 },
  { lines: ['86%', '48%'], name: 64 },
  { lines: ['70%'], name: 88 },
];

/**
 * Hits in the Channel search panel (`features/Channels/ChannelSearch.tsx`): a 28px
 * avatar, the name and time on one line, then the clamped snippet, padded like a hit
 * button so the real results paint over the same rows. `rows` trims it for a next page.
 */
export const ChannelSearchSkeleton = ({ rows = SEARCH_HIT_ROWS.length }: { rows?: number }) => (
  <Flexbox aria-busy gap={2}>
    {SEARCH_HIT_ROWS.slice(0, rows).map(({ lines, name }, index) => (
      <Flexbox horizontal gap={10} key={index} paddingBlock={8} paddingInline={10}>
        <Skeleton.Avatar shape={'circle'} size={28} />
        <Flexbox flex={1} gap={8} paddingBlock={'2px 0'} style={{ minWidth: 0 }}>
          <Flexbox horizontal align={'center'} gap={6}>
            <SkeletonBar height={13} width={name} />
            <SkeletonBar height={11} width={36} />
          </Flexbox>
          {lines.map((width, line) => (
            <SkeletonBar height={13} key={line} width={width} />
          ))}
        </Flexbox>
      </Flexbox>
    ))}
  </Flexbox>
);

/**
 * Body of a Channel conversation (`features/Channels/ChannelConversation.tsx`):
 * the full-width feed with 24px gutters, then the composer's activity line and
 * its one-row input (attach, editor, send). Also the conversation's own
 * data-loading state, so route load and detail fetch share one shape.
 */
export const ChannelConversationSkeleton = () => (
  <div aria-busy {...stylex.props(styles.root)}>
    <Flexbox flex={1} paddingBlock={'16px 24px'} paddingInline={16} style={{ minHeight: 0 }}>
      {MESSAGE_ROWS.map((row, index) => (
        <MessageRowSkeleton key={index} {...row} />
      ))}
    </Flexbox>
    <Flexbox flex={'none'} gap={4} paddingBlock={'0 12px'} paddingInline={8}>
      <Flexbox height={24} />
      <Flexbox
        horizontal
        align={'center'}
        className={stylex.props(styles.composer).className}
        gap={4}
        padding={4}
      >
        <SkeletonBar height={28} radius={'50%'} width={28} />
        <Flexbox flex={1} paddingInline={8}>
          <SkeletonBar height={14} width={'32%'} />
        </Flexbox>
        <SkeletonBar height={28} radius={'50%'} width={28} />
      </Flexbox>
    </Flexbox>
  </div>
);

/** A Channel page: the 44px header (hash, title, member avatars) over the conversation. */
const ChannelLayoutSkeleton = () => (
  <Flexbox aria-busy flex={1} height={'100%'} style={{ minHeight: 0, overflow: 'hidden' }}>
    <Flexbox
      horizontal
      align={'center'}
      flex={'none'}
      height={44}
      justify={'space-between'}
      padding={8}
    >
      <Flexbox horizontal align={'center'} gap={8} paddingInline={4}>
        <SkeletonBar height={18} width={18} />
        <SkeletonBar height={20} width={144} />
      </Flexbox>
      <SkeletonBar height={28} radius={14} width={72} />
    </Flexbox>
    <ChannelConversationSkeleton />
  </Flexbox>
);

export default ChannelLayoutSkeleton;
