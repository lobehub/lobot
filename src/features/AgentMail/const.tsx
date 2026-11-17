import type { AgentAccountKind } from '@lobot/types';
import type { LucideIcon } from 'lucide-react';
import { Mail } from 'lucide-react';

/**
 * One address channel the mail page can open.
 *
 * The pair (kind, provider) is what the control plane is asked for; the icon
 * and copy are presentation. `prefixable` marks the channels where the caller
 * may ask for a specific handle (a mailbox local part, for example); a channel
 * whose handles the provider mints on its own leaves it off.
 */
interface IdentityChannel {
  /** What follows the chosen prefix in an address on this channel. */
  addressSuffix: string;
  descKey: 'identity.mail.desc';
  icon: LucideIcon;
  kind: AgentAccountKind;
  prefixable: boolean;
  provider: string;
  titleKey: 'identity.mail.title';
}

export const IDENTITY_CHANNELS: IdentityChannel[] = [
  {
    addressSuffix: '@lobe.id',
    descKey: 'identity.mail.desc',
    icon: Mail,
    kind: 'mail',
    prefixable: true,
    provider: 'agent-mail',
    titleKey: 'identity.mail.title',
  },
];
