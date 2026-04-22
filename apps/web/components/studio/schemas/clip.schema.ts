import { z } from 'zod';
import { fullMetadataSchema } from './base.schema';

export const clipFormSchema = fullMetadataSchema.extend({
  contentType: z.literal('CLIP'),
});

export type ClipFormValues = z.infer<typeof clipFormSchema>;
