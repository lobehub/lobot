import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import { type AsyncRouter, type UntypedClient } from './routers';

export const asyncClient: UntypedClient = createTRPCClient<AsyncRouter>({
  links: [
    httpBatchLink({
      maxURLLength: 2083,
      transformer: superjson,
      url: '/trpc/async',
    }),
  ],
});
