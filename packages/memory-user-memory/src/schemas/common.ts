import { TypesEnum } from '@lobot/types';
import { z } from 'zod';

export const MemoryTypeSchema = z.nativeEnum(TypesEnum);
