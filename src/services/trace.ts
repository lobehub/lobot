import { API_ENDPOINTS } from '@/services/_url';
import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';
import { type TraceEventBasePayload, type TraceEventPayloads } from '@/types/trace';

class TraceService {}

export const traceService = new TraceService();
