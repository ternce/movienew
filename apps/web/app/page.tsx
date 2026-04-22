import LandingPageClient from './page-client';

// force-dynamic only works in Server Components — prevents prerendering at build time
export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return <LandingPageClient />;
}
