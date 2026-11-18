import { Navigate } from 'react-router';

import { CHANNEL_SETTINGS_PARAM } from './tabs';

/** Settings open beside the Channel's feed now; an old settings link lands there. */
export default function ChannelSettingsRedirect() {
  return (
    <Navigate
      replace
      relative="path"
      to={{ pathname: '..', search: `?${CHANNEL_SETTINGS_PARAM}=1` }}
    />
  );
}
