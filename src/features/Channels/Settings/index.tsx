import { Navigate, useSearchParams } from 'react-router';

import { CHANNEL_SETTINGS_PARAM } from './tabs';

/** Settings open beside the Channel's feed now; an old settings link lands there. */
export default function ChannelSettingsRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'general';
  return (
    <Navigate
      replace
      relative="path"
      to={{ pathname: '..', search: `?${CHANNEL_SETTINGS_PARAM}=${encodeURIComponent(tab)}` }}
    />
  );
}
