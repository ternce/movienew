import { z } from 'zod';
import { baseContentSchema } from './base.schema';

export const shortFormSchema = baseContentSchema.extend({
  contentType: z.literal('SHORT'),
  tagIds: z.array(z.string()).optional().default([]),
  categoryId: z.string().optional(),
});

export type ShortFormValues = z.infer<typeof shortFormSchema>;
