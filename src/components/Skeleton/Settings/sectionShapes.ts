import type { SettingsSectionsShape } from './Sections';

/**
 * Per-tab section shapes for settings pages whose layout is not a plain form.
 * Measured against the settled pages at a 1440px-wide window: filled group heads
 * are 57px (76px with a description, 64px with an action button), sections are
 * 36px apart, and the first section starts 24px below the navigation header.
 * Group titles and descriptions are static copy, so they render as text
 * (`heading` / `descKey`). Rows below the first viewport are a plausible fill.
 */
export const SETTINGS_SECTION_SHAPES: Record<string, SettingsSectionsShape> = {
  billing: {
    sections: [
      { heading: ['subscription', 'summary.title'], split: true, variant: 'summary' },
      {
        columns: 2,
        extra: { height: 32, width: 56 },
        heading: ['subscription', 'currentPlan.title'],
        icon: false,
        lines: 14,
        variant: 'detail',
      },
      { columns: 4, heading: ['subscription', 'billing.history'], rows: 1, variant: 'table' },
    ],
  },
  credits: {
    sections: [
      {
        aside: { height: 200, width: 350 },
        heading: ['subscription', 'balance.title'],
        secondary: true,
        variant: 'summary',
      },
      {
        cards: 6,
        columns: 3,
        footer: true,
        gap: 8,
        grouped: true,
        heading: ['subscription', 'credits.topUp.titleUsd'],
        size: 'small',
        variant: 'cards',
      },
      {
        descKey: ['subscription', 'credits.costEstimateHint.desc'],
        field: 'input',
        heading: ['subscription', 'credits.costEstimateHint.title'],
        variant: 'form',
      },
      {
        descKey: ['subscription', 'credits.autoTopUp.descUsd'],
        field: 'input',
        heading: ['subscription', 'credits.autoTopUp.title'],
        variant: 'form',
      },
      {
        extra: { height: 32, width: 348 },
        heading: ['subscription', 'credits.packages.titleUsd'],
        rows: 2,
        tabs: true,
        variant: 'table',
      },
    ],
  },
  plans: {
    sections: [
      {
        cards: 3,
        columns: 3,
        gap: 12,
        toolbar: { gap: 24, height: 44, width: 437 },
        variant: 'cards',
      },
    ],
  },
  referral: {
    sections: [
      { variant: 'banner' },
      {
        descKey: ['subscription', 'referral.inviteLink.description'],
        field: 'snippet',
        heading: ['subscription', 'referral.inviteLink.title'],
        variant: 'form',
      },
      {
        descKey: ['subscription', 'referral.inviteCode.description'],
        extra: { height: 24, width: 24 },
        field: 'snippet',
        heading: ['subscription', 'referral.inviteCode.title'],
        variant: 'form',
      },
      {
        columns: 4,
        descKey: ['subscription', 'referral.stats.description'],
        heading: ['subscription', 'referral.stats.title'],
        inset: true,
        tileHeight: 61,
        tiles: 4,
        variant: 'tiles',
      },
      { columns: 5, heading: ['subscription', 'referral.table.title'], rows: 1, variant: 'table' },
      {
        descKey: ['subscription', 'referral.rules.description'],
        heading: ['subscription', 'referral.rules.title'],
        lines: 7,
        variant: 'rules',
      },
    ],
  },
  usage: {
    sections: [
      {
        blocks: [
          {
            caption: ['subscription', 'usage.overview.section.credits'],
            cellHeight: 95,
            labels: [
              ['subscription', 'usage.overview.credits.topUp'],
              ['subscription', 'usage.window.referral'],
            ],
          },
          {
            caption: ['subscription', 'usage.overview.section.storage'],
            cellHeight: 70,
            labels: [
              ['subscription', 'usage.storage.file.used'],
              ['subscription', 'usage.storage.embeddings.used'],
            ],
          },
        ],
        extra: { height: 24, width: 146 },
        heading: ['subscription', 'usage.overview.title'],
        variant: 'quota',
      },
      { columns: 8, heading: ['spend', 'table.title'], rows: 10, toolbar: true, variant: 'table' },
    ],
  },
};
