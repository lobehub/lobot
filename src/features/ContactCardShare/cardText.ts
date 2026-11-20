import type { ContactCard, ContactCardType } from '@lobot/types';
import { t } from 'i18next';

/** "[Agent card] Writer" / "[Contact card] Max" in the viewer's language. */
export const contactCardPreview = (card: { name: string | null; type: ContactCardType }) =>
  t(card.type === 'user' ? 'contactCard.preview.user' : 'contactCard.preview.agent', {
    name: card.name?.trim() || '',
    ns: 'channel',
  }).trim();

/** The name a card goes by, falling back to a person's handle. */
export const contactCardName = (card: ContactCard): string =>
  card.name?.trim() || (card.type === 'user' ? card.username || '' : '');

/** The English text the server stores as a card message's content, by the card it describes. */
const FALLBACK_PREFIXES = [
  ['[Contact card] ', 'user'],
  ['[Agent card] ', 'agent'],
] as const;

/**
 * A card message's stored text ("[Agent card] Writer") in the viewer's language, for a view that
 * carries only the content, such as a reply quote or a notification. Other text is returned as is.
 */
export const localizeCardFallback = (content: string): string => {
  for (const [prefix, type] of FALLBACK_PREFIXES)
    if (content.startsWith(prefix))
      return contactCardPreview({ name: content.slice(prefix.length), type });
  return content;
};
