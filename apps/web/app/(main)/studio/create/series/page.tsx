'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const SeriesWizard = dynamic(
  () =>
    import('@/components/studio/wizards/series-wizard').then((m) => ({
      default: m.SeriesWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-36 rounded bg-[#10131c]" />
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="h-px flex-1 bg-[#272b38]" />}
              <div className="h-8 w-8 rounded-full bg-[#10131c]" />
              <div className="hidden sm:block h-4 w-20 rounded bg-[#10131c]" />
            </div>
          ))}
        </div>
        <div className="h-80 rounded-xl bg-[#10131c]" />
      </div>
    ),
  }
);

export default function CreateSeriesPage() {
  const router = useRouter();

  return (
    <div className="py-8 md:py-12">
      <SeriesWizard onSuccess={(id) => router.push(`/studio/${id}`)} />
    </div>
  );
}
