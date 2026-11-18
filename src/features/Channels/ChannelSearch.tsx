import { Avatar, Button, SearchBar } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type ChannelSearchHit, channelService } from '@/services/channel';
import { markdownToTxt } from '@/utils/markdownToTxt';

import { authorAvatar } from './memberName';
import { ChannelSidePanel } from './MemberPanel';
import { channelMessageTime } from './messagePresentation';

const styles = stylex.create({
  box: {
    // Gives way before the title and icons in a narrow window.
    flexShrink: 1,
    minWidth: 140,
    width: 220,
    transitionDuration: '150ms',
    transitionProperty: 'width',
  },
  boxActive: { width: 320 },
  list: {
    overflowY: 'auto',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: 2,
    minHeight: 0,
    padding: 8,
  },
  status: {
    paddingBlock: 24,
    paddingInline: 16,
    fontSize: 13,
    color: cssVar.colorTextTertiary,
    textAlign: 'center',
  },
  hit: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    width: '100%',
    paddingBlock: 8,
    paddingInline: 10,
    borderWidth: 0,
    borderRadius: cssVar.borderRadiusLG,
    font: 'inherit',
    textAlign: 'start',
    color: 'inherit',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
    cursor: 'pointer',
  },
  body: { display: 'flex', flex: '1', flexDirection: 'column', gap: 2, minWidth: 0 },
  meta: { display: 'flex', gap: 6, alignItems: 'baseline', minWidth: 0 },
  name: {
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: 600,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: { flexShrink: 0, fontSize: 12, color: cssVar.colorTextTertiary },
  thread: {
    overflow: 'hidden',
    fontSize: 12,
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  snippet: {
    overflow: 'hidden',
    display: '-webkit-box',
    fontSize: 13,
    lineHeight: 1.5,
    color: cssVar.colorTextSecondary,
    overflowWrap: 'anywhere',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
  },
  mark: {
    borderRadius: 2,
    color: cssVar.colorText,
    backgroundColor: cssVar.colorWarningBg,
  },
  more: { display: 'flex', justifyContent: 'center', paddingBlock: 8 },
  sentinel: { flexShrink: 0, height: 1 },
});

const escapeRegExp = (value: string) => value.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');

/** Splits `text` so every occurrence of a query word, any case, is its own marked part. */
export const highlightParts = (text: string, query: string) => {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!terms.length) return [{ match: false, text }];
  const lower = new Set(terms.map((term) => term.toLowerCase()));
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu');
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ match: lower.has(part.toLowerCase()), text: part }));
};

interface SearchState {
  error: boolean;
  hasMore: boolean;
  hits: ChannelSearchHit[];
  loading: boolean;
}

const IDLE: SearchState = { error: false, hasMore: false, hits: [], loading: false };

/** Results for one query, newest first; `loadMore` appends the next older page. */
export const useChannelSearch = (channelId: string, query: string) => {
  const [state, setState] = useState<SearchState>(() => ({ ...IDLE, loading: !!query.trim() }));
  const [cursor, setCursor] = useState<number>();
  const [attempt, setAttempt] = useState(0);
  // A new query starts over.
  const [key, setKey] = useState(`${channelId}\n${query}`);
  if (key !== `${channelId}\n${query}`) {
    setKey(`${channelId}\n${query}`);
    setCursor(undefined);
    setState({ ...IDLE, loading: !!query.trim() });
  }
  useEffect(() => {
    if (!query.trim()) return;
    let current = true;
    channelService.searchMessages(channelId, query, cursor).then(
      (page) => {
        if (!current) return;
        setState((prev) => ({
          error: false,
          hasMore: page.hasMore,
          hits: cursor === undefined ? page.messages : [...prev.hits, ...page.messages],
          loading: false,
        }));
      },
      (error: unknown) => {
        console.error('Failed to search Channel messages', error);
        if (current) setState((prev) => ({ ...prev, error: true, loading: false }));
      },
    );
    return () => {
      current = false;
    };
  }, [attempt, channelId, cursor, query]);
  return {
    ...state,
    loadMore: () => {
      setState((prev) => ({ ...prev, loading: true }));
      setCursor(state.hits.at(-1)?.sequence);
    },
    retry: () => {
      setState((prev) => ({ ...prev, error: false, loading: true }));
      setAttempt((count) => count + 1);
    },
  };
};

/** The header's search box, Discord-style: narrow until focused or holding a query. */
export function ChannelSearchBox({
  onChange,
  onSearch,
  value,
}: {
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  value: string;
}) {
  const { t } = useTranslation('channel');
  const [focused, setFocused] = useState(false);
  return (
    <SearchBar
      allowClear
      enableShortKey
      aria-label={t('search.shortcut')}
      placeholder={t('search.placeholder')}
      shortKey="mod+f"
      title={t('search.shortcut')}
      value={value}
      variant="filled"
      {...stylex.props(styles.box, (focused || !!value) && styles.boxActive)}
      onBlur={() => setFocused(false)}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => setFocused(true)}
      onSearch={(next) => {
        if (next.trim()) onSearch(next.trim());
      }}
    />
  );
}

const SearchHit = ({
  hit,
  onOpen,
  query,
}: {
  hit: ChannelSearchHit;
  onOpen: (hit: ChannelSearchHit) => void;
  query: string;
}) => {
  const { t, i18n } = useTranslation('channel');
  const text = markdownToTxt(hit.snippet).replaceAll(/\s+/g, ' ').trim();
  let parts: ReactNode = text;
  if (text)
    parts = highlightParts(text, query).map((part, index) =>
      part.match ? (
        <mark key={index} {...stylex.props(styles.mark)}>
          {part.text}
        </mark>
      ) : (
        part.text
      ),
    );
  const name = hit.author.name || t('deletedMember');
  return (
    <button type="button" {...stylex.props(styles.hit)} onClick={() => onOpen(hit)}>
      <Avatar avatar={authorAvatar(hit.author)} shape="circle" size={28} title={name} />
      <span {...stylex.props(styles.body)}>
        <span {...stylex.props(styles.meta)}>
          <span {...stylex.props(styles.name)}>{name}</span>
          <time dateTime={new Date(hit.createdAt).toISOString()} {...stylex.props(styles.time)}>
            {channelMessageTime(new Date(hit.createdAt), {
              locale: i18n.language,
              yesterday: t('date.yesterday'),
            })}
          </time>
        </span>
        {hit.threadId && (
          <span {...stylex.props(styles.thread)}>
            {hit.threadTitle
              ? t('search.inThread', { title: hit.threadTitle })
              : t('search.inThreadUntitled')}
          </span>
        )}
        <span {...stylex.props(styles.snippet)}>{parts}</span>
      </span>
    </button>
  );
};

/** Search results beside the conversation; picking one jumps to the message. */
export function ChannelSearchPanel({
  availableWidth,
  channelId,
  id,
  onClose,
  onOpen,
  query,
}: {
  availableWidth?: number;
  channelId: string;
  id: string;
  onClose: () => void;
  onOpen: (hit: ChannelSearchHit) => void;
  query: string;
}) {
  const { t } = useTranslation('channel');
  const search = useChannelSearch(channelId, query);
  const { error, hasMore, hits, loading } = search;
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(search.loadMore);
  loadMoreRef.current = search.loadMore;
  const canLoadMore = hasMore && !loading && !error;
  // Loads the next page as the end of the list nears; the sentinel remounts after each
  // page, so a page too short to fill the panel pulls the next one by itself.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canLoadMore || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { root: listRef.current, rootMargin: '0px 0px 240px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore]);
  return (
    <ChannelSidePanel
      availableWidth={availableWidth}
      closeLabel={t('search.close')}
      id={id}
      label={t('search.title')}
      title={t('search.title')}
      onClose={onClose}
    >
      <div ref={listRef} {...stylex.props(styles.list)}>
        {hits.map((hit) => (
          <SearchHit hit={hit} key={hit.id} query={query} onOpen={onOpen} />
        ))}
        {error ? (
          <div {...stylex.props(styles.status)}>
            <p>{t('search.error')}</p>
            <Button size="small" onClick={search.retry}>
              {t('retry', { ns: 'common' })}
            </Button>
          </div>
        ) : loading ? (
          <div {...stylex.props(hits.length ? styles.more : styles.status)}>
            <Button loading size="small" type="text" />
          </div>
        ) : hasMore ? (
          <div aria-hidden ref={sentinelRef} {...stylex.props(styles.sentinel)} />
        ) : (
          !hits.length && <div {...stylex.props(styles.status)}>{t('search.empty', { query })}</div>
        )}
      </div>
    </ChannelSidePanel>
  );
}
