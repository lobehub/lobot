import { type MetaData } from '@/types/meta';

export type MetaDataDispatch = { type: 'update'; value: Partial<MetaData> } | { type: 'reset' };
