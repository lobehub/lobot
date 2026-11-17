import type { UIChatMessage } from '@lobot/types';

/**
 * Message in flat list
 *
 * Can be either:
 * 1. Original message from database
 * 2. Virtual message created by parse() with extended role and children
 */
export type FlatMessage = UIChatMessage;
