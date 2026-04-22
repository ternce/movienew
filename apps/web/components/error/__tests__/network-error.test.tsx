import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  OfflineIndicator,
  NetworkError,
  InlineNetworkError,
  FullPageNetworkError,
  NetworkStatusToast,
  WithNetworkError,
} from '../network-error';

// Mock navigator.onLine
const mockOnLine = vi.fn(() => true);
Object.defineProperty(navigator, 'onLine', {
  get: mockOnLine,
  configurable: true,
});

// Store event listeners for testing
const eventListeners: Record<string, Function[]> = {
  online: [],
  offline: [],
};

// Mock window.addEventListener and removeEventListener
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

beforeEach(() => {
  eventListeners.online = [];
  eventListeners.offline = [];

  window.addEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
    if (event === 'online' || event === 'offline') {
      eventListeners[event].push(handler as Function);
    }
  }) as typeof window.addEventListener;

  window.removeEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
    if (event === 'online' || event === 'offline') {
      const index = eventListeners[event].indexOf(handler as Function);
      if (index > -1) {
        eventListeners[event].splice(index, 1);
      }
    }
  }) as typeof window.removeEventListener;

  mockOnLine.mockReturnValue(true);
  vi.useFakeTimers();
});

afterEach(() => {
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Helper to trigger online/offline events
const triggerOnline = () => {
  mockOnLine.mockReturnValue(true);
  eventListeners.online.forEach((handler) => handler());
};

const triggerOffline = () => {
  mockOnLine.mockReturnValue(false);
  eventListeners.offline.forEach((handler) => handler());
};

describe('OfflineIndicator', () => {
  it('should not render when online', () => {
    mockOnLine.mockReturnValue(true);
    render(<OfflineIndicator />);

    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
  });

  it('should render when offline', () => {
    mockOnLine.mockReturnValue(false);
    render(<OfflineIndicator />);

    // Trigger offline event after mount
    act(() => {
      triggerOffline();
    });

    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText('Нет подключения к интернету')).toBeInTheDocument();
  });

  it('should show recovery message after going back online', async () => {
    mockOnLine.mockReturnValue(false);
    render(<OfflineIndicator />);

    // Go offline first
    act(() => {
      triggerOffline();
    });

    // Then go back online
    act(() => {
      triggerOnline();
    });

    expect(screen.getByText('Подключение восстановлено')).toBeInTheDocument();
  });

  it('should have correct role attribute', () => {
    mockOnLine.mockReturnValue(false);
    render(<OfflineIndicator />);

    act(() => {
      triggerOffline();
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have aria-live attribute for accessibility', () => {
    mockOnLine.mockReturnValue(false);
    render(<OfflineIndicator />);

    act(() => {
      triggerOffline();
    });

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = render(<OfflineIndicator />);
    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('NetworkError', () => {
  it('should render with default message', () => {
    render(<NetworkError />);

    expect(screen.getByTestId('network-error')).toBeInTheDocument();
    expect(screen.getByText('Не удалось загрузить данные')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<NetworkError message="Custom error message" />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);

    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<NetworkError />);

    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('should call onRetry when button is clicked', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<NetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state while retrying', async () => {
    const onRetry = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<NetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('should disable button while retrying', async () => {
    const onRetry = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<NetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));

    expect(screen.getByTestId('retry-button')).toBeDisabled();
  });

  it('should disable button when offline', () => {
    mockOnLine.mockReturnValue(false);
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);

    act(() => {
      triggerOffline();
    });

    expect(screen.getByTestId('retry-button')).toBeDisabled();
  });

  it('should show offline message when offline', () => {
    mockOnLine.mockReturnValue(false);
    render(<NetworkError message="Custom message" />);

    act(() => {
      triggerOffline();
    });

    expect(screen.getByText('Нет подключения к интернету')).toBeInTheDocument();
  });

  it('should have role=alert for accessibility', () => {
    render(<NetworkError />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<NetworkError className="custom-class" />);

    expect(screen.getByTestId('network-error')).toHaveClass('custom-class');
  });

  it('should use custom retry label', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} retryLabel="Try again" />);

    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('should not retry when already retrying', async () => {
    const onRetry = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<NetworkError onRetry={onRetry} />);

    // Click twice quickly
    fireEvent.click(screen.getByTestId('retry-button'));
    fireEvent.click(screen.getByTestId('retry-button'));

    // Should only be called once
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('InlineNetworkError', () => {
  it('should render with default message', () => {
    render(<InlineNetworkError />);

    expect(screen.getByTestId('inline-network-error')).toBeInTheDocument();
    expect(screen.getByText('Не удалось загрузить')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<InlineNetworkError message="Failed to load data" />);

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<InlineNetworkError onRetry={onRetry} />);

    expect(screen.getByTestId('inline-retry-button')).toBeInTheDocument();
  });

  it('should call onRetry when button is clicked', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<InlineNetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('inline-retry-button'));

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading text while retrying', async () => {
    const onRetry = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<InlineNetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('inline-retry-button'));

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('should show offline message when offline', () => {
    mockOnLine.mockReturnValue(false);
    render(<InlineNetworkError />);

    act(() => {
      triggerOffline();
    });

    expect(screen.getByText('Нет подключения')).toBeInTheDocument();
  });

  it('should have role=alert for accessibility', () => {
    render(<InlineNetworkError />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('FullPageNetworkError', () => {
  it('should render full page layout', () => {
    render(<FullPageNetworkError />);

    // Should contain NetworkError component
    expect(screen.getByTestId('network-error')).toBeInTheDocument();
  });

  it('should pass props to NetworkError', () => {
    const onRetry = vi.fn();
    render(
      <FullPageNetworkError
        message="Full page error"
        onRetry={onRetry}
        retryLabel="Reload page"
      />
    );

    expect(screen.getByText('Full page error')).toBeInTheDocument();
    expect(screen.getByText('Reload page')).toBeInTheDocument();
  });

  it('should have min-h-screen class for full page', () => {
    const { container } = render(<FullPageNetworkError />);

    // Check for full page container
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-h-screen');
  });
});

describe('NetworkStatusToast', () => {
  it('should not render when online and not recovered', () => {
    mockOnLine.mockReturnValue(true);
    render(<NetworkStatusToast />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should show toast after recovering from offline', () => {
    mockOnLine.mockReturnValue(false);
    render(<NetworkStatusToast />);

    // Simulate going offline then online
    act(() => {
      triggerOffline();
    });

    act(() => {
      triggerOnline();
    });

    expect(screen.getByText('Подключение восстановлено')).toBeInTheDocument();
  });

  it('should auto-hide after 3 seconds', async () => {
    mockOnLine.mockReturnValue(false);
    render(<NetworkStatusToast />);

    act(() => {
      triggerOffline();
    });

    act(() => {
      triggerOnline();
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    // Advance timer by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should have aria-live attribute', () => {
    mockOnLine.mockReturnValue(false);
    render(<NetworkStatusToast />);

    act(() => {
      triggerOffline();
    });

    act(() => {
      triggerOnline();
    });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('WithNetworkError', () => {
  it('should render children when no error', () => {
    render(
      <WithNetworkError error={null}>
        <div data-testid="child">Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render NetworkError for TypeError', () => {
    const error = new TypeError('Failed to fetch');
    render(
      <WithNetworkError error={error}>
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('network-error')).toBeInTheDocument();
  });

  it('should render NetworkError for "Failed to fetch" message', () => {
    const error = new Error('Failed to fetch');
    render(
      <WithNetworkError error={error}>
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('network-error')).toBeInTheDocument();
  });

  it('should render NetworkError for "network" in message', () => {
    const error = new Error('Network request failed');
    render(
      <WithNetworkError error={error}>
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('network-error')).toBeInTheDocument();
  });

  it('should render NetworkError for "fetch" in message', () => {
    const error = new Error('Fetch error occurred');
    render(
      <WithNetworkError error={error}>
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('network-error')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const error = new TypeError('Network error');
    render(
      <WithNetworkError
        error={error}
        fallback={<div data-testid="custom-fallback">Custom fallback</div>}
      >
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('should pass onRetry to NetworkError', () => {
    const onRetry = vi.fn();
    const error = new TypeError('Failed to fetch');
    render(
      <WithNetworkError error={error} onRetry={onRetry}>
        <div>Child content</div>
      </WithNetworkError>
    );

    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('should throw non-network errors for error boundary', () => {
    const error = new Error('Non-network error');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <WithNetworkError error={error}>
          <div>Child content</div>
        </WithNetworkError>
      );
    }).toThrow('Non-network error');

    consoleError.mockRestore();
  });
});

describe('Accessibility', () => {
  it('NetworkError should have role="alert"', () => {
    render(<NetworkError />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('InlineNetworkError should have role="alert"', () => {
    render(<InlineNetworkError />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('OfflineIndicator should have aria-live="polite"', () => {
    mockOnLine.mockReturnValue(false);
    render(<OfflineIndicator />);

    act(() => {
      triggerOffline();
    });

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });

  it('NetworkStatusToast should have role="status"', () => {
    mockOnLine.mockReturnValue(false);
    render(<NetworkStatusToast />);

    act(() => {
      triggerOffline();
    });

    act(() => {
      triggerOnline();
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
