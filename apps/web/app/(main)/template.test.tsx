import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MainTemplate from './template';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('@/components/layout/page-transition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-transition">{children}</div>
  ),
}));

describe('MainTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not wrap Watch Party routes in the page transition layer', () => {
    vi.mocked(usePathname).mockReturnValue('/watch-party/join/invite-token');

    render(
      <MainTemplate>
        <div>Watch Party room</div>
      </MainTemplate>,
    );

    expect(screen.getByText('Watch Party room')).not.toBeNull();
    expect(screen.queryByTestId('page-transition')).toBeNull();
  });

  it('keeps page transitions for other main routes', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');

    render(
      <MainTemplate>
        <div>Dashboard</div>
      </MainTemplate>,
    );

    expect(screen.getByText('Dashboard')).not.toBeNull();
    expect(screen.getByTestId('page-transition')).not.toBeNull();
  });
});
