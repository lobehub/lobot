import { cssVar, Flexbox } from '@lobehub/ui';

import { ProductLogo } from '@/components/Branding';

/**
 * The blank page beside the list when no conversation is open, like an IM client's: a faint
 * logo and nothing to act on, instead of a # header over an error.
 */
export const ChannelEmpty = () => (
  <Flexbox align="center" data-testid="channel-empty" flex={1} height="100%" justify="center">
    <ProductLogo size={36} style={{ color: cssVar.colorFill }} type="text" />
  </Flexbox>
);
