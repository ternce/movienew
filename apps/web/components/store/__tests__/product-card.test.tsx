import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard, type ProductContent } from '@/components/store/product-card';

// Mock Next.js modules
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: Record<string, unknown>) => (
    <button disabled={disabled as boolean} onClick={onClick as () => void} {...props}>
      {children as React.ReactNode}
    </button>
  ),
}));

const mockProduct: ProductContent = {
  id: 'p1',
  name: 'Тестовый товар',
  slug: 'test-product',
  images: ['/product.jpg'],
  price: 2990,
  bonusPrice: 500,
  stockQuantity: 10,
  status: 'ACTIVE',
};

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render product name', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('Тестовый товар')).toBeInTheDocument();
    });

    it('should render formatted price in RUB', () => {
      render(<ProductCard product={mockProduct} />);
      // formatPrice with Russian locale formats as "2 990 ₽"
      const priceElement = screen.getByText(/2[\s\u00a0]990/);
      expect(priceElement).toBeInTheDocument();
    });

    it('should render bonus price line', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText(/или.*500.*бонусов/)).toBeInTheDocument();
    });

    it('should render product image', () => {
      render(<ProductCard product={mockProduct} />);
      const img = screen.getByAltText('Тестовый товар');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/product.jpg');
    });

    it('should render as links to /store/{slug}', () => {
      render(<ProductCard product={mockProduct} />);
      const links = screen.getAllByRole('link');
      const storeLinks = links.filter(l => l.getAttribute('href') === '/store/test-product');
      expect(storeLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Out of stock', () => {
    it('should show "Нет в наличии" overlay when stockQuantity=0', () => {
      const outOfStock = { ...mockProduct, stockQuantity: 0 };
      render(<ProductCard product={outOfStock} />);
      const elements = screen.getAllByText('Нет в наличии');
      // Overlay span + button text
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "Нет в наличии" when status is OUT_OF_STOCK', () => {
      const outOfStock = { ...mockProduct, status: 'OUT_OF_STOCK' as const };
      render(<ProductCard product={outOfStock} />);
      const elements = screen.getAllByText('Нет в наличии');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable add-to-cart button when out of stock', () => {
      const outOfStock = { ...mockProduct, stockQuantity: 0 };
      render(<ProductCard product={outOfStock} />);
      const buttons = screen.getAllByRole('button');
      const cartButton = buttons.find(b => b.textContent?.includes('Нет в наличии'));
      expect(cartButton).toBeDisabled();
    });
  });

  describe('No bonus price', () => {
    it('should not show bonus line when bonusPrice is undefined', () => {
      const noBonusProduct = { ...mockProduct, bonusPrice: undefined };
      render(<ProductCard product={noBonusProduct} />);
      expect(screen.queryByText(/бонусов/)).not.toBeInTheDocument();
    });
  });

  describe('No image', () => {
    it('should show placeholder when images array is empty', () => {
      const noImageProduct = { ...mockProduct, images: [] };
      render(<ProductCard product={noImageProduct} />);
      expect(screen.queryByAltText('Тестовый товар')).not.toBeInTheDocument();
    });
  });

  describe('Add to cart', () => {
    it('should call onAddToCart with product id when button clicked', () => {
      const onAddToCart = vi.fn();
      render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
      const buttons = screen.getAllByRole('button');
      const cartButton = buttons.find(b => b.textContent?.includes('В корзину'));
      expect(cartButton).toBeDefined();
      fireEvent.click(cartButton!);
      expect(onAddToCart).toHaveBeenCalledWith('p1');
    });

    it('should show "В корзину" text when in stock', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText(/В корзину/)).toBeInTheDocument();
    });
  });
});
