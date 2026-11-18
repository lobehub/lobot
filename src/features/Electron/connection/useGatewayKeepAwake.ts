import { useElectronStore } from '@/store/electron';
import { electronGatewaySelectors } from '@/store/electron/selectors';

/**
 * Whether this computer is kept from idle-sleeping while its device gateway
 * connection is enabled. Persisted in the desktop main-process store.
 */
export const useGatewayKeepAwake = () => {
  const [useFetchGatewayKeepAwake, setKeepAwake] = useElectronStore((s) => [
    s.useFetchGatewayKeepAwake,
    s.setGatewayKeepAwake,
  ]);
  const { error } = useFetchGatewayKeepAwake();
  const enabled = useElectronStore(electronGatewaySelectors.keepAwake);

  return { enabled, isLoading: enabled === undefined && !error, setKeepAwake };
};
