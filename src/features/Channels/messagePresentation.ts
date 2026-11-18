import type { ChannelPublicMessage, ChannelPublicThread } from '@lobot/types';

import type { TimelineItem } from './joinEvents';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const itemDate = (item: TimelineItem) =>
  new Date(item.kind === 'event' ? item.event.at : item.message.createdAt);

const sameAuthor = (a: ChannelPublicMessage, b: ChannelPublicMessage) =>
  !!a.author.id && a.author.id === b.author.id && a.author.type === b.author.type;

/**
 * A deleted message leaves the feed, unless a Thread grew from it: then it keeps its place as a
 * "deleted" line so the Thread card under it stays reachable.
 */
export const visibleChannelMessages = <T extends Pick<ChannelPublicMessage, 'deletedAt' | 'id'>>(
  messages: T[],
  threads: Pick<ChannelPublicThread, 'rootMessageId'>[],
) =>
  messages.some((message) => message.deletedAt)
    ? messages.filter(
        (message) =>
          !message.deletedAt || threads.some((thread) => thread.rootMessageId === message.id),
      )
    : messages;

/** Group only adjacent speech; system events, dates and reply contexts break a group. */
export const presentChannelTimeline = (items: TimelineItem[]) =>
  items.map((item, index) => {
    const previous = items[index - 1];
    const date = itemDate(item);
    const previousDate = previous && itemDate(previous);
    const startsDay = !previousDate || date.toDateString() !== previousDate.toDateString();
    const elapsed = previousDate ? date.getTime() - previousDate.getTime() : Infinity;
    const continuation =
      !startsDay &&
      elapsed >= 0 &&
      elapsed <= GROUP_WINDOW_MS &&
      item.kind === 'message' &&
      previous?.kind === 'message' &&
      sameAuthor(item.message, previous.message) &&
      item.message.threadId === previous.message.threadId &&
      item.message.replyToId === previous.message.replyToId;

    return { continuation, date, item, startsDay };
  });

type ChannelTimeFormatters = Record<'date' | 'day' | 'full' | 'time', Intl.DateTimeFormat>;

// Building an `Intl.DateTimeFormat` costs far more than formatting with one, and every message in
// the feed asks for the same few: build them once per locale.
const formattersByLocale = new Map<string, ChannelTimeFormatters>();

/** Stable clock labels keep the feed scannable and do not depend on dayjs's global locale. */
export const channelTimeFormatters = (locale: string): ChannelTimeFormatters => {
  let formatters = formattersByLocale.get(locale);
  if (!formatters) {
    formatters = {
      date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }),
      day: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'medium' }),
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    };
    formattersByLocale.set(locale, formatters);
  }
  return formatters;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `date` to `now`, in local time, unaffected by daylight-saving shifts. */
const calendarDaysAgo = (date: Date, now: Date) =>
  Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      DAY_MS,
  );

/**
 * A message's header time, the way Discord stamps it: the time alone today (the day divider above
 * names the date), "Yesterday" with the time, and the numeric date with the time before that, so a
 * message read away from its divider still says which day it was sent.
 */
export const channelMessageTime = (
  date: Date,
  {
    locale,
    now = new Date(),
    yesterday,
  }: {
    locale: string;
    now?: Date;
    yesterday: string;
  },
) => {
  const formatters = channelTimeFormatters(locale);
  const time = formatters.time.format(date);
  const days = calendarDaysAgo(date, now);
  if (days === 0) return time;
  const day = days === 1 ? yesterday : formatters.day.format(date);
  return `${day} ${time}`;
};

/** Messages from before yesterday are history: a long one folds by default so scrolling back stays quick. */
export const foldsByDefault = (date: Date, now = new Date()) => calendarDaysAgo(date, now) >= 2;
