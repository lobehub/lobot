import { openInWebApp } from '@/features/Electron/navigation/webApp';

/** Lobot takes no payments: plans, billing and overflow settings are managed on the web. */
export const openPlans = () => openInWebApp('/settings/plans');
export const openBilling = () => openInWebApp('/settings/billing');
export const openUsageSettings = () => openInWebApp('/settings/usage');
