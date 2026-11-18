import { useTaskStore } from '@/store/task';
import { taskLabelSelectors } from '@/store/task/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/slices/auth/selectors';

/**
 * Sync the task label registry into the task store, read through
 * `taskLabelSelectors`. Mounted by every surface that renders or picks task
 * labels; concurrent mounts share one request. The replica is partitioned by
 * workspace, so a switch never shows the previous registry.
 *
 * @returns isLoading - not loaded yet and a fetch is in flight
 * @returns error / mutate - for a failure state with Retry
 */
export const useFetchTaskLabels = () => {
  const isLogin = useUserStore(authSelectors.isLogin);
  const useFetch = useTaskStore((s) => s.useFetchTaskLabels);
  const isInit = useTaskStore(taskLabelSelectors.isLabelsInit);

  const { error, isValidating, revalidate } = useFetch(!!isLogin);

  return { error, isLoading: !isInit && isValidating, mutate: revalidate };
};
