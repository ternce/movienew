import { z } from 'zod';

export const baseContentSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
  slug: z.string().max(200).optional().or(z.literal('')),
  description: z.string().min(1, 'Описание обязательно').max(5000, 'Максимум 5000 символов'),
  ageCategory: z.enum(['0+', '6+', '12+', '16+', '18+'], {
    required_error: 'Выберите возрастную категорию',
  }),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED']).default('DRAFT'),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  previewUrl: z.string().optional().or(z.literal('')),
  isFree: z.boolean().default(false),
  individualPrice: z.coerce.number().min(0).optional(),
});

export const fullMetadataSchema = baseContentSchema.extend({
  categoryId: z.string().min(1, 'Выберите тематику'),
  tagIds: z.array(z.string()).optional().default([]),
  genreIds: z.array(z.string()).optional().default([]),
});

export type BaseContentFormValues = z.infer<typeof baseContentSchema>;
export type FullMetadataFormValues = z.infer<typeof fullMetadataSchema>;
