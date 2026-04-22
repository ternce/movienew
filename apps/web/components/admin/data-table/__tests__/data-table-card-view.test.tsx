import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableCardView } from '@/components/admin/data-table/data-table-card-view';
import type { Row, Cell } from '@tanstack/react-table';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-down" className={className} />
  ),
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) =>
    args
      .flat()
      .filter(Boolean)
      .join(' '),
}));

// Mock flexRender from @tanstack/react-table
vi.mock('@tanstack/react-table', () => ({
  flexRender: (cellContent: any, context: any) => {
    if (typeof cellContent === 'function') {
      return cellContent(context);
    }
    return cellContent;
  },
}));

/**
 * Helper to create a mock TanStack Table Row
 */
function createMockRow(
  id: string,
  cells: { header: string; value: string }[],
  selected = false
): Row<unknown> {
  return {
    id,
    getIsSelected: () => selected,
    getVisibleCells: () =>
      cells.map((c, i) => ({
        id: `${id}_cell_${i}`,
        column: {
          id: c.header.toLowerCase().replace(/\s/g, '_'),
          columnDef: {
            header: c.header,
            cell: () => c.value,
          },
        },
        getContext: () => ({}),
      })) as unknown as Cell<unknown, unknown>[],
  } as unknown as Row<unknown>;
}

describe('DataTableCardView', () => {
  describe('Loading state', () => {
    it('should render 5 skeleton cards when isLoading', () => {
      const { container } = render(<DataTableCardView rows={[]} isLoading={true} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(5);
    });

    it('should not render data rows when loading', () => {
      const rows = [
        createMockRow('1', [{ header: 'Name', value: 'Test' }]),
      ];
      render(<DataTableCardView rows={rows} isLoading={true} />);
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should render "No results found." when empty', () => {
      render(<DataTableCardView rows={[]} isLoading={false} />);
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('Card rendering', () => {
    it('should render one card per row', () => {
      const rows = [
        createMockRow('1', [
          { header: 'Name', value: 'Row 1' },
          { header: 'Email', value: 'row1@test.com' },
        ]),
        createMockRow('2', [
          { header: 'Name', value: 'Row 2' },
          { header: 'Email', value: 'row2@test.com' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      expect(screen.getByText('Row 1')).toBeInTheDocument();
      expect(screen.getByText('Row 2')).toBeInTheDocument();
    });

    it('should show first 3 columns as preview', () => {
      const rows = [
        createMockRow('1', [
          { header: 'Name', value: 'Alice' },
          { header: 'Email', value: 'alice@test.com' },
          { header: 'Role', value: 'Admin' },
          { header: 'Status', value: 'Active' },
          { header: 'Created', value: '2025-01-01' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      // Preview cells should be visible
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('alice@test.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      // Detail cells should not be visible until expanded
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('2025-01-01')).not.toBeInTheDocument();
    });

    it('should display header text and cell value', () => {
      const rows = [
        createMockRow('1', [
          { header: 'Имя', value: 'Иван' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      expect(screen.getByText('Имя')).toBeInTheDocument();
      expect(screen.getByText('Иван')).toBeInTheDocument();
    });
  });

  describe('Expand/collapse', () => {
    it('should show "Подробнее" when row has >3 columns', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
          { header: 'D', value: '4' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      expect(screen.getByText('Подробнее')).toBeInTheDocument();
    });

    it('should not show expand button when row has ≤3 columns', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      expect(screen.queryByText('Подробнее')).not.toBeInTheDocument();
      expect(screen.queryByText('Скрыть')).not.toBeInTheDocument();
    });

    it('should expand to show remaining columns', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
          { header: 'D', value: '4' },
          { header: 'E', value: '5' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      expect(screen.queryByText('4')).not.toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Подробнее'));

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should change text to "Скрыть" when expanded', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
          { header: 'D', value: '4' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      fireEvent.click(screen.getByText('Подробнее'));
      expect(screen.getByText('Скрыть')).toBeInTheDocument();
      expect(screen.queryByText('Подробнее')).not.toBeInTheDocument();
    });

    it('should collapse on "Скрыть" click', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
          { header: 'D', value: 'hidden-value' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      fireEvent.click(screen.getByText('Подробнее'));
      expect(screen.getByText('hidden-value')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Скрыть'));
      expect(screen.queryByText('hidden-value')).not.toBeInTheDocument();
      expect(screen.getByText('Подробнее')).toBeInTheDocument();
    });

    it('should support multiple rows expanded independently', () => {
      const rows = [
        createMockRow('row-1', [
          { header: 'A', value: 'r1-a' },
          { header: 'B', value: 'r1-b' },
          { header: 'C', value: 'r1-c' },
          { header: 'D', value: 'r1-hidden' },
        ]),
        createMockRow('row-2', [
          { header: 'A', value: 'r2-a' },
          { header: 'B', value: 'r2-b' },
          { header: 'C', value: 'r2-c' },
          { header: 'D', value: 'r2-hidden' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      const expandButtons = screen.getAllByText('Подробнее');
      expect(expandButtons.length).toBe(2);

      // Expand first row only
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText('r1-hidden')).toBeInTheDocument();
      expect(screen.queryByText('r2-hidden')).not.toBeInTheDocument();

      // Expand second row too
      fireEvent.click(screen.getByText('Подробнее')); // only one "Подробнее" left
      expect(screen.getByText('r1-hidden')).toBeInTheDocument();
      expect(screen.getByText('r2-hidden')).toBeInTheDocument();
    });
  });

  describe('Selected row', () => {
    it('should apply accent border class when selected', () => {
      const rows = [
        createMockRow('1', [{ header: 'Name', value: 'Selected Row' }], true),
      ];

      const { container } = render(<DataTableCardView rows={rows} />);
      const card = container.querySelector('[class*="border-mp-accent-primary"]');
      expect(card).toBeInTheDocument();
    });

    it('should not apply accent border class when not selected', () => {
      const rows = [
        createMockRow('1', [{ header: 'Name', value: 'Normal Row' }], false),
      ];

      const { container } = render(<DataTableCardView rows={rows} />);
      const card = container.querySelector('[class*="border-mp-accent-primary/50"]');
      expect(card).not.toBeInTheDocument();
    });
  });

  describe('Chevron', () => {
    it('should rotate 180° when expanded', () => {
      const rows = [
        createMockRow('1', [
          { header: 'A', value: '1' },
          { header: 'B', value: '2' },
          { header: 'C', value: '3' },
          { header: 'D', value: '4' },
        ]),
      ];

      render(<DataTableCardView rows={rows} />);
      const chevron = screen.getByTestId('icon-chevron-down');
      expect(chevron.getAttribute('class')).not.toContain('rotate-180');

      fireEvent.click(screen.getByText('Подробнее'));
      const expandedChevron = screen.getByTestId('icon-chevron-down');
      expect(expandedChevron.getAttribute('class')).toContain('rotate-180');
    });
  });
});
