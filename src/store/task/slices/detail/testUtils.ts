import { vi } from 'vitest';

import { cacheScope, replicaKeys } from '@/libs/replica';
import { mutate } from '@/libs/swr';

import { taskDetailResource } from './projection';
