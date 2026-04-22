import type { AgeCategory } from '@/components/content';

const AGE_MAP: Record<string, string> = {
  ZERO_PLUS: '0+',
  SIX_PLUS: '6+',
  TWELVE_PLUS: '12+',
  SIXTEEN_PLUS: '16+',
  EIGHTEEN_PLUS: '18+',
  '0+': '0+',
  '6+': '6+',
  '12+': '12+',
  '16+': '16+',
  '18+': '18+',
};

export function normalizeAgeCategory(raw: string): AgeCategory {
  return (AGE_MAP[raw] ?? raw) as AgeCategory;
}
