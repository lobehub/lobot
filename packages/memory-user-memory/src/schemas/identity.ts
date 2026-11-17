import { MergeStrategyEnum } from '@lobot/types';
import { z } from 'zod';

import { MemoryTypeSchema } from './common';

const RELATIONSHIP_ENUM = [
  'self',
  'father',
  'mother',
  'son',
  'daughter',
  'brother',
  'sister',
  'sibling',
  'husband',
  'wife',
  'spouse',
  'partner',
  'couple',
  'friend',
  'colleague',
  'coworker',
  'classmate',
  'mentor',
  'mentee',
  'manager',
  'teammate',
  'grandfather',
  'grandmother',
  'grandson',
  'granddaughter',
  'uncle',
  'aunt',
  'nephew',
  'niece',
  'other',
] as const;

const RelationshipEnum = z.enum(RELATIONSHIP_ENUM);
const IdentityTypeEnum = z.enum(['professional', 'personal', 'demographic']);

export const AddIdentityActionSchema = z
  .object({
    details: z.union([z.string(), z.null()]).describe('Optional detailed information'),
    memoryCategory: z.string().describe('Memory category'),
    memoryType: MemoryTypeSchema.describe('Memory type'),
    summary: z.string().describe('Concise overview of this specific memory'),
    tags: z.array(z.string()).describe('Model generated tags that summarize the identity facets'),
    title: z
      .string()
      .describe(
        'Honorific-style, concise descriptor (strength + domain/milestone), avoid bare job titles; e.g., "Trusted open-source maintainer", "Specializes in low-latency infra", "Former Aliyun engineer", "Cares for rescue cats"',
      ),
    withIdentity: z
      .object({
        description: z.string(),
        episodicDate: z.union([z.string(), z.null()]),
        extractedLabels: z.array(z.string()),
        relationship: RelationshipEnum,
        role: z
          .string()
          .nullable()
          .describe(
            'Role explicitly mentioned for this identity entry (e.g., "platform engineer", "caregiver"); keep neutral and only use when evidence exists, otherwise null',
          ),
        scoreConfidence: z.number(),
        sourceIds: z
          .array(z.string())
          .nullable()
          .default(() => [])
          .describe('Stable source message ids that support this identity'),
        sourceEvidence: z.union([z.string(), z.null()]),
        type: IdentityTypeEnum,
      })
      .strict(),
  })
  .strict();

type WithoutNullFields<T> = { [K in keyof T]?: Exclude<T[K], null> };

/** Drop null-valued keys, narrowing the nullable input shape to the optional output one. */
const dropNullFields = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== null),
  ) as WithoutNullFields<T>;

/**
 * Input of the updateIdentityMemory tool. The tool manifest only requires `set.withIdentity`
 * and tells the model to "use null for omitting the field", so every other field is optional
 * and a null leaves the stored value untouched instead of being written over it.
 * UpdateIdentityActionSchema keeps every field present because the extractor feeds it to
 * strict structured output, which requires that.
 *
 * Use `z.input` for the raw tool arguments (nulls allowed) and `z.output` for the parsed
 * value handed to services (nulls dropped).
 */
export const UpdateIdentityToolInputSchema = z
  .object({
    id: z.string(),
    mergeStrategy: z.nativeEnum(MergeStrategyEnum),
    set: z
      .object({
        details: z.string().nullish(),
        memoryCategory: z.string().nullish(),
        memoryType: MemoryTypeSchema.nullish(),
        summary: z.string().nullish(),
        tags: z.array(z.string()).nullish(),
        title: z.string().nullish(),
        withIdentity: z
          .object({
            description: z.string().nullish(),
            episodicDate: z.string().nullish(),
            extractedLabels: z.array(z.string()).nullish(),
            relationship: z.string().nullish(),
            role: z.string().nullish(),
            scoreConfidence: z.number().nullish(),
            sourceIds: z.array(z.string()).nullish(),
            sourceEvidence: z.string().nullish(),
            type: z.string().nullish(),
          })
          .strict()
          .transform(dropNullFields),
      })
      .transform(({ withIdentity, ...rest }) => ({ ...dropNullFields(rest), withIdentity })),
  })
  .strict();

export const RemoveIdentityActionSchema = z
  .object({
    id: z.string(),
    reason: z.string(),
  })
  .strict();
