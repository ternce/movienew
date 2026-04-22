import { render, screen } from '@testing-library/react';
import { PageTransition } from '@/components/layout/page-transition';
import { useReducedMotion } from 'framer-motion';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, className, initial, animate, exit, variants, transition, ...rest }: any) => (
      <div
        className={className}
        data-testid="motion-div"
        data-initial={initial}
        data-animate={animate}
        data-exit={exit}
        data-variants={JSON.stringify(variants)}
      >
        {children}
      </div>
    )),
  },
  useReducedMotion: vi.fn(() => false),
}));

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('should render children correctly', () => {
    render(
      <PageTransition>
        <span>Test Content</span>
      </PageTransition>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <PageTransition className="custom-class">
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.className).toContain('custom-class');
  });

  it('should use slideUp variant by default', () => {
    render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') || '{}');
    expect(variants).toHaveProperty('initial');
    expect(variants).toHaveProperty('animate');
    expect(variants.initial).toEqual({ opacity: 0, y: 12 });
    expect(variants.animate).toEqual({ opacity: 1, y: 0 });
  });

  it('should use fade variant when specified', () => {
    render(
      <PageTransition variant="fade">
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') || '{}');
    expect(variants.initial).toEqual({ opacity: 0 });
    expect(variants.animate).toEqual({ opacity: 1 });
  });

  it('should use scale variant when specified', () => {
    render(
      <PageTransition variant="scale">
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') || '{}');
    expect(variants.initial).toEqual({ opacity: 0, scale: 0.96 });
    expect(variants.animate).toEqual({ opacity: 1, scale: 1 });
  });

  it('should use slideLeft variant when specified', () => {
    render(
      <PageTransition variant="slideLeft">
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') || '{}');
    expect(variants.initial).toEqual({ opacity: 0, x: 20 });
    expect(variants.animate).toEqual({ opacity: 1, x: 0 });
  });

  it('should pass initial and animate props to motion.div', () => {
    render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.getAttribute('data-initial')).toBe('initial');
    expect(motionDiv.getAttribute('data-animate')).toBe('animate');
    expect(motionDiv.getAttribute('data-exit')).toBe('exit');
  });

  it('should render plain div when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { container } = render(
      <PageTransition className="test-class">
        <span>Content</span>
      </PageTransition>
    );

    // Should render a plain div, not a motion.div
    expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();

    // The plain div should still have the className
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('test-class');
  });
});
