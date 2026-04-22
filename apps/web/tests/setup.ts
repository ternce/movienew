import '@testing-library/jest-dom';

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerEvent for Radix UI slider
global.PointerEvent = class PointerEvent extends MouseEvent {
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
  }
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver for components using scroll detection (e.g. ShortCard, ShortsPage)
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock HTMLVideoElement methods for video components
HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
HTMLVideoElement.prototype.pause = vi.fn();
HTMLVideoElement.prototype.load = vi.fn();
