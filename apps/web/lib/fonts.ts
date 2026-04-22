import { Inter, JetBrains_Mono } from 'next/font/google';

/**
 * Inter font - Primary font for UI
 * Supports Latin and Cyrillic characters
 */
export const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

/**
 * JetBrains Mono font - Monospace font for code
 * Supports Latin and Cyrillic characters
 */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
});

/**
 * Combined font variables for use in className
 */
export const fontVariables = `${inter.variable} ${jetbrainsMono.variable}`;
