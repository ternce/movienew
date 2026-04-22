import { Spinner } from '@/components/ui/spinner';

export default function MainLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="xl" />
    </div>
  );
}
