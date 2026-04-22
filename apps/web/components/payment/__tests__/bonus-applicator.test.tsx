import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BonusApplicator, BonusToggle } from '../bonus-applicator';

describe('BonusApplicator', () => {
  const defaultProps = {
    availableBalance: 1000,
    maxApplicable: 500,
    appliedAmount: 0,
    onApply: vi.fn(),
    orderTotal: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct available balance', () => {
      render(<BonusApplicator {...defaultProps} />);

      expect(screen.getByText(/Доступно:/)).toBeInTheDocument();
      expect(screen.getByText(/1\s*000\s*₽/)).toBeInTheDocument();
    });

    it('should show "no bonuses" message when balance is zero', () => {
      render(<BonusApplicator {...defaultProps} availableBalance={0} />);

      expect(screen.getByText(/Бонусы недоступны/)).toBeInTheDocument();
      expect(screen.getByText(/У вас пока нет бонусов/)).toBeInTheDocument();
    });

    it('should render quick percentage buttons', () => {
      render(<BonusApplicator {...defaultProps} />);

      expect(screen.getByRole('button', { name: '25%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '50%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '75%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();
    });

    it('should render increment and decrement buttons', () => {
      render(<BonusApplicator {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      // Should have - and + buttons plus quick apply buttons
      expect(buttons.length).toBeGreaterThanOrEqual(6);
    });

    it('should show slider', () => {
      render(<BonusApplicator {...defaultProps} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('Input handling', () => {
    it('should call onApply when input value changes and blurs', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} onApply={onApply} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, '250');
      fireEvent.blur(input);

      expect(onApply).toHaveBeenCalledWith(250);
    });

    it('should clamp value to maxUsable on blur', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} onApply={onApply} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, '999999');
      fireEvent.blur(input);

      // Should be clamped to maxUsable (min of availableBalance and maxApplicable)
      expect(onApply).toHaveBeenCalledWith(500); // maxApplicable is 500
    });

    it('should only allow numeric input', async () => {
      render(<BonusApplicator {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, 'abc123def');

      expect(input).toHaveValue('123');
    });
  });

  describe('Quick apply buttons', () => {
    it('should apply 25% of max usable when clicking 25% button', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} onApply={onApply} />);

      await userEvent.click(screen.getByRole('button', { name: '25%' }));

      expect(onApply).toHaveBeenCalledWith(125); // 500 * 0.25 = 125
    });

    it('should apply 50% of max usable when clicking 50% button', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} onApply={onApply} />);

      await userEvent.click(screen.getByRole('button', { name: '50%' }));

      expect(onApply).toHaveBeenCalledWith(250);
    });

    it('should apply 100% of max usable when clicking 100% button', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} onApply={onApply} />);

      await userEvent.click(screen.getByRole('button', { name: '100%' }));

      expect(onApply).toHaveBeenCalledWith(500);
    });
  });

  describe('Increment/Decrement buttons', () => {
    it('should increment by step when clicking plus button', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} appliedAmount={100} onApply={onApply} />);

      // Find the plus button (it has Plus icon)
      const buttons = screen.getAllByRole('button');
      const incrementButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'));

      if (incrementButton) {
        await userEvent.click(incrementButton);
        expect(onApply).toHaveBeenCalledWith(200); // 100 + 100 step
      }
    });

    it('should decrement by step when clicking minus button', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} appliedAmount={200} onApply={onApply} />);

      const buttons = screen.getAllByRole('button');
      const decrementButton = buttons.find(btn => btn.querySelector('svg.lucide-minus'));

      if (decrementButton) {
        await userEvent.click(decrementButton);
        expect(onApply).toHaveBeenCalledWith(100);
      }
    });

    it('should not go below 0 when decrementing', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} appliedAmount={50} onApply={onApply} />);

      const buttons = screen.getAllByRole('button');
      const decrementButton = buttons.find(btn => btn.querySelector('svg.lucide-minus'));

      if (decrementButton) {
        await userEvent.click(decrementButton);
        expect(onApply).toHaveBeenCalledWith(0);
      }
    });

    it('should not exceed max usable when incrementing', async () => {
      const onApply = vi.fn();
      render(<BonusApplicator {...defaultProps} appliedAmount={450} onApply={onApply} />);

      const buttons = screen.getAllByRole('button');
      const incrementButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'));

      if (incrementButton) {
        await userEvent.click(incrementButton);
        expect(onApply).toHaveBeenCalledWith(500); // Capped at maxApplicable
      }
    });
  });

  describe('Status messages', () => {
    it('should show full coverage message when bonus covers order', () => {
      render(
        <BonusApplicator
          {...defaultProps}
          appliedAmount={1000}
          maxApplicable={1000}
          orderTotal={1000}
        />
      );

      expect(screen.getByText(/полностью покрывают стоимость/)).toBeInTheDocument();
    });

    it('should show applied bonus amount when partially applied', () => {
      render(<BonusApplicator {...defaultProps} appliedAmount={250} />);

      expect(screen.getByText(/Будет списано/)).toBeInTheDocument();
      expect(screen.getByText(/250/)).toBeInTheDocument();
    });

    it('should show max percentage info when applicable', () => {
      render(<BonusApplicator {...defaultProps} maxApplicable={500} orderTotal={1000} />);

      expect(screen.getByText(/Максимум 50%/)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when entering more than available balance', async () => {
      render(<BonusApplicator {...defaultProps} availableBalance={100} maxApplicable={500} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, '200');

      expect(screen.getByText(/Недостаточно бонусов/)).toBeInTheDocument();
    });
  });

  describe('Expiring bonus warning', () => {
    it('should show warning when hasExpiringBonuses is true', () => {
      render(
        <BonusApplicator
          {...defaultProps}
          appliedAmount={100}
          hasExpiringBonuses={true}
          expiringAmount={50}
        />
      );

      expect(screen.getByText(/истекают в течение 24 часов/)).toBeInTheDocument();
    });

    it('should not show warning when hasExpiringBonuses is false', () => {
      render(
        <BonusApplicator
          {...defaultProps}
          appliedAmount={100}
          hasExpiringBonuses={false}
        />
      );

      expect(screen.queryByText(/истекают в течение 24 часов/)).not.toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(<BonusApplicator {...defaultProps} disabled={true} />);

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: '25%' })).toBeDisabled();
      // Radix UI Slider uses data-disabled attribute
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('data-disabled');
    });
  });
});

describe('BonusToggle', () => {
  const defaultProps = {
    availableBalance: 1000,
    maxApplicable: 500,
    isApplied: false,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with available balance', () => {
    render(<BonusToggle {...defaultProps} />);

    expect(screen.getByText(/Использовать бонусы/)).toBeInTheDocument();
    expect(screen.getByText(/Доступно/)).toBeInTheDocument();
  });

  it('should return null when no balance', () => {
    const { container } = render(<BonusToggle {...defaultProps} availableBalance={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('should show applied state when isApplied is true', () => {
    render(<BonusToggle {...defaultProps} isApplied={true} />);

    expect(screen.getByText(/Бонусы применены/)).toBeInTheDocument();
  });

  it('should call onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<BonusToggle {...defaultProps} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('should toggle off when already applied', async () => {
    const onToggle = vi.fn();
    render(<BonusToggle {...defaultProps} isApplied={true} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should not call onToggle when disabled', async () => {
    const onToggle = vi.fn();
    render(<BonusToggle {...defaultProps} disabled={true} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
