'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ShortWizard = dynamic(
  () =>
    import('@/components/studio/wizards/short-wizard').then((m) => ({
      default: m.ShortWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-[#10131c]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-xl bg-[#10131c]" />
          <div className="space-y-4">
            <div className="h-10 rounded bg-[#10131c]" />
            <div className="h-24 rounded bg-[#10131c]" />
            <div className="h-10 rounded bg-[#10131c]" />
            <div className="h-10 rounded bg-[#10131c]" />
          </div>
        </div>
      </div>
    ),
  }
);

export default function CreateShortPage() {
  const router = useRouter();

  return (
    <div className="py-8 md:py-12">
      <ShortWizard onSuccess={(id) => router.push(`/studio/${id}`)} />
    </div>
  );
}
