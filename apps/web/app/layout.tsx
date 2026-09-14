import type { Metadata, Viewport } from 'next';

import { Providers } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

/**
 * Site metadata
 */
export const metadata: Metadata = {
  applicationName: 'SESH',
  title: {
    default: 'SESH — Streaming Platform',
    template: '%s | SESH',
  },
  description:
    'Next-generation video streaming platform with series, tutorials, and exclusive content. Watch anytime, anywhere.',
  keywords: [
    'streaming',
    'video',
    'series',
    'tutorials',
    'movies',
    'entertainment',
    'видео',
    'сериалы',
    'фильмы',
  ],
  authors: [{ name: 'SESH Team' }],
  creator: 'SESH',
  publisher: 'SESH',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'SESH',
    title: 'SESH — Streaming Platform',
    description:
      'Next-generation video streaming platform with series, tutorials, and exclusive content.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SESH',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SESH — Streaming Platform',
    description:
      'Next-generation video streaming platform with series, tutorials, and exclusive content.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'SESH',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/site.webmanifest',
};

/**
 * Viewport configuration
 */
export const viewport: Viewport = {
  themeColor: '#05060A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'dark',
  viewportFit: 'cover',
};

/**
 * Root layout component
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`dark ${fontVariables}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mp-accent-primary focus:text-white focus:rounded-lg"
        >
          Перейти к содержимому
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
