import { Spinner } from '@/components/ui/spinner';

export default function ShortsLoading() {
  return (
    <div className="h-[calc(100vh-64px)] -m-4 md:-m-6 flex items-center justify-center bg-black">
      <Spinner size="xl" />
    </div>
  );
}
