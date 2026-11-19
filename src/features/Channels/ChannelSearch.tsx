import { ActionIcon, Button, SearchBar } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { SearchIcon } from 'lucide-react';
import { type FocusEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChannelSearchSkeleton } from '@/components/Skeleton/Channel';
import { useDelayedVisible } from '@/components/Skeleton/Delayed';
import { type ChannelSearchHit, channelService } from '@/services/channel';
import { markdownToTxt } from '@/utils/markdownToTxt';

import { AuthorAvatar } from './AuthorAvatar';
import { ChannelSidePanel } from './MemberPanel';
import { channelMessageTime } from './messagePresentation';

const styles = stylex.create({
  /** Sits where the header's right buttons were, without spanning the title. */
  field: {
    flexShrink: 1,
    minWidth: 140,
    width: 220,
  },
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
    backgroundColor: cssVar.colorWarningBorder,
  },
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

/** An icon until opened. ⌘F still opens it, the same shortcut the field used to show. */
export function ChannelSearchBox({
  onChange,
  onOpenChange,
  onSearch,
  value,
}: {
  onChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onSearch: (query: string) => void;
  value: string;
}) {
  const { t } = useTranslation('channel');
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  // A draft query keeps the field up after it loses focus; an empty field closes.
  const expanded = open || !!value;
  const reveal = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    fieldRef.current?.querySelector('input')?.focus();
  }, [open]);

  useEffect(() => {
    if (expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.shiftKey || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f') return;
      event.preventDefault();
      setOpen(true);
      onOpenChange?.(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, onOpenChange]);

  if (!expanded) {
    return (
      <ActionIcon
        aria-label={t('search.shortcut')}
        icon={SearchIcon}
        size="small"
        title={t('search.shortcut')}
        onClick={() => reveal(true)}
      />
    );
  }

  const close = () => {
    onChange('');
    reveal(false);
  };
  return (
    <div
      ref={fieldRef}
      {...stylex.props(styles.field)}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (!value) reveal(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        close();
      }}
    >
      <SearchBar
        allowClear
        enableShortKey
        aria-label={t('search.placeholder')}
        placeholder={t('search.placeholder')}
        shortKey="mod+f"
        style={{ width: '100%' }}
        value={value}
        variant="filled"
        onChange={(event) => onChange(event.target.value)}
        onSearch={(next) => {
          if (next.trim()) onSearch(next.trim());
        }}
      />
    </div>
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
      <AuthorAvatar author={hit.author} size={28} />
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

/**
 * Hit-shaped rows while a page loads: the first page fills the panel, a next page adds
 * one row. Held back for the shared 200ms so a fast search goes straight to results.
 */
const SearchLoading = ({ rows }: { rows?: number }) =>
  useDelayedVisible() ? <ChannelSearchSkeleton rows={rows} /> : null;

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
          <SearchLoading key={hits.length} rows={hits.length ? 1 : undefined} />
        ) : hasMore ? (
          <div aria-hidden ref={sentinelRef} {...stylex.props(styles.sentinel)} />
        ) : (
          !hits.length && <div {...stylex.props(styles.status)}>{t('search.empty', { query })}</div>
        )}
      </div>
    </ChannelSidePanel>
  );
}
