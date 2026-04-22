'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ClipWizard = dynamic(
  () =>
    import('@/components/studio/wizards/clip-wizard').then((m) => ({
      default: m.ClipWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-36 rounded bg-[#10131c]" />
        <div className="flex gap-2 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#10131c]" />
              <div className="h-4 w-20 rounded bg-[#10131c] hidden sm:block" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-10 rounded bg-[#10131c]" />
          <div className="h-40 rounded bg-[#10131c]" />
          <div className="h-10 rounded bg-[#10131c]" />
        </div>
      </div>
    ),
  }
);

export default function CreateClipPage() {
  const router = useRouter();

  return (
    <div className="py-8 md:py-12">
      <ClipWizard onSuccess={(id) => router.push(`/studio/${id}`)} />
    </div>
  );
}
