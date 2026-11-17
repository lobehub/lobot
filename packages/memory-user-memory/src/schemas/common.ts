import { TypesEnum } from '@lobechat/types';
import { z } from 'zod';

export const MemoryTypeSchema = z.nativeEnum(TypesEnum);
