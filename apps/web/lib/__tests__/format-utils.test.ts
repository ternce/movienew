import { formatDuration, formatNumber, formatPrice, formatFileSize, getInitials, truncate, slugify, debounce } from '@/lib/utils';

describe('formatDuration', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatDuration(185)).toBe('3:05');
  });

  it('should format 0 seconds to 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should format seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('should handle exact minutes', () => {
    expect(formatDuration(120)).toBe('2:00');
  });

  it('should format hours correctly (3661 → 1:01:01)', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('should format exact hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('should pad minutes and seconds with zeros for hours format', () => {
    expect(formatDuration(7265)).toBe('2:01:05');
  });
});

describe('formatNumber', () => {
  it('should format small numbers without modification', () => {
    // Russian locale uses non-breaking space as thousands separator
    const result = formatNumber(999);
    expect(result).toBe('999');
  });

  it('should format thousands with locale separator', () => {
    const result = formatNumber(12500);
    // Russian locale uses non-breaking space
    expect(result).toMatch(/12[\s\u00a0]500/);
  });

  it('should format millions', () => {
    const result = formatNumber(1500000);
    expect(result).toMatch(/1[\s\u00a0]500[\s\u00a0]000/);
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPrice', () => {
  it('should format with RUB currency symbol', () => {
    const result = formatPrice(2990);
    // Russian ruble formatting
    expect(result).toMatch(/2[\s\u00a0]990/);
    expect(result).toMatch(/₽/);
  });

  it('should handle zero price', () => {
    const result = formatPrice(0);
    expect(result).toMatch(/0/);
    expect(result).toMatch(/₽/);
  });

  it('should format without currency when showCurrency is false', () => {
    const result = formatPrice(500, false);
    expect(result).toBe('500');
    expect(result).not.toContain('₽');
  });

  it('should format large prices', () => {
    const result = formatPrice(125000);
    expect(result).toMatch(/125[\s\u00a0]000/);
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 Б');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 КБ');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 МБ');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 ГБ');
  });
});

describe('getInitials', () => {
  it('should generate initials from two-word name', () => {
    expect(getInitials('Алексей Петров')).toBe('АП');
  });

  it('should limit to 2 characters', () => {
    expect(getInitials('Алексей Иванович Петров')).toBe('АИ');
  });

  it('should handle single word', () => {
    expect(getInitials('Алексей')).toBe('А');
  });
});

describe('truncate', () => {
  it('should not truncate short text', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should truncate long text with ellipsis', () => {
    expect(truncate('This is a very long text', 10)).toBe('This is...');
  });

  it('should handle exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

describe('slugify', () => {
  it('should convert text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('Hello   World')).toBe('hello-world');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify('-Hello World-')).toBe('hello-world');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should pass arguments to the debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
