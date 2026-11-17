import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { TFunction } from 'i18next';

import { parseCronPattern, WEEKDAYS } from './CronConfig';

dayjs.extend(utc);
dayjs.extend(timezone);

const padTime = (n: number) => String(n).padStart(2, '0');

const formatHHmm = (hour: number, minute: number) => `${padTime(hour)}:${padTime(minute)}`;

/**
 * Localized timezone display name (e.g. "China Standard Time", "Pacific Daylight Time").
 * Falls back to the IANA id when the runtime can't resolve a long name.
 */
export const formatTimezoneName = (tz: string, locale: string): string => {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
};

/**
 * Human description of a cron pattern like "Every day 09:00" or "Every 2 hours :30".
 */
export const formatScheduleDescription = (pattern: string, t: TFunction<'chat'>): string => {
  const parsed = parseCronPattern(pattern);
  switch (parsed.scheduleType) {
    case 'hourly': {
      const interval = parsed.hourlyInterval ?? 1;
      // Reading ':30' literally felt awkward in the summary, so call it out as
      // "half past" and stay implicit on :00; any other minute is named as is.
      const minute = parsed.triggerMinute;
      if (interval === 1) {
        if (minute === 0) return t('taskSchedule.summary.hourly');
        if (minute === 30) return t('taskSchedule.summary.hourlyHalfPast');
        return t('taskSchedule.summary.hourlyAtMinute', { minute: padTime(minute) });
      }
      if (minute === 0) return t('taskSchedule.summary.everyNHours', { count: interval });
      if (minute === 30) return t('taskSchedule.summary.everyNHoursHalfPast', { count: interval });
      return t('taskSchedule.summary.everyNHoursAtMinute', {
        count: interval,
        minute: padTime(minute),
      });
    }
    case 'daily': {
      return t('taskSchedule.summary.daily', {
        time: formatHHmm(parsed.triggerHour, parsed.triggerMinute),
      });
    }
    case 'weekly': {
      const days = parsed.weekdays ?? [];
      const allDays = days.length === 7;
      if (allDays) {
        return t('taskSchedule.summary.daily', {
          time: formatHHmm(parsed.triggerHour, parsed.triggerMinute),
        });
      }
      const labels = [...days]
        .sort((a, b) => a - b)
        .map((d) => t(WEEKDAYS.find((w) => w.key === d)!.label as any))
        .join('/');
      return t('taskSchedule.summary.weekly', {
        days: labels,
        time: formatHHmm(parsed.triggerHour, parsed.triggerMinute),
      });
    }
  }
};
