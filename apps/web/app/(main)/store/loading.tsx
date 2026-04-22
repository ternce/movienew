import { ProductCardSkeletonGrid } from '@/components/store';
import { Container } from '@/components/ui/container';

export default function StoreLoading() {
  return (
    <Container size="full" className="py-6">
      <div className="mb-6">
        <div className="h-8 w-32 rounded-lg bg-mp-surface animate-pulse" />
        <div className="h-4 w-48 rounded bg-mp-surface animate-pulse mt-2" />
      </div>
      <ProductCardSkeletonGrid count={12} columns={4} />
    </Container>
  );
}
