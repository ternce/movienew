import { create } from 'zustand';

/**
 * Modal configuration
 */
interface ModalConfig {
  id: string;
  data?: unknown;
  onClose?: () => void;
}

/**
 * UI state interface
 */
interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Mobile menu
  isMobileMenuOpen: boolean;

  // Modals
  modals: ModalConfig[];

  // Search
  isSearchOpen: boolean;
  searchQuery: string;

  // Loading states
  isGlobalLoading: boolean;
  loadingMessage: string | null;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions - Mobile menu
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Actions - Modals
  openModal: (id: string, data?: unknown, onClose?: () => void) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  getModalData: <T>(id: string) => T | undefined;

  // Actions - Search
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

/**
 * UI store for global UI state management
 */
export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  modals: [],
  isSearchOpen: false,
  searchQuery: '',
  isGlobalLoading: false,
  loadingMessage: null,

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  // Mobile menu actions
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  // Modal actions
  openModal: (id, data, onClose) =>
    set((state) => {
      // Don't add duplicate modals
      if (state.modals.some((m) => m.id === id)) {
        return state;
      }
      return {
        modals: [...state.modals, { id, data, onClose }],
      };
    }),

  closeModal: (id) =>
    set((state) => {
      if (id) {
        // Close specific modal
        const modal = state.modals.find((m) => m.id === id);
        modal?.onClose?.();
        return {
          modals: state.modals.filter((m) => m.id !== id),
        };
      }
      // Close last modal
      const lastModal = state.modals[state.modals.length - 1];
      lastModal?.onClose?.();
      return {
        modals: state.modals.slice(0, -1),
      };
    }),

  closeAllModals: () => {
    const { modals } = get();
    modals.forEach((m) => m.onClose?.());
    set({ modals: [] });
  },

  getModalData: <T>(id: string) => {
    const modal = get().modals.find((m) => m.id === id);
    return modal?.data as T | undefined;
  },

  // Search actions
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  setSearchOpen: (open) => set({ isSearchOpen: open, searchQuery: open ? get().searchQuery : '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Loading actions
  setGlobalLoading: (loading, message) =>
    set({
      isGlobalLoading: loading,
      loadingMessage: loading ? message ?? null : null,
    }),
}));

/**
 * Selector hooks for common UI state
 */
export const useIsSidebarOpen = () => useUIStore((state) => state.isSidebarOpen);
export const useIsSidebarCollapsed = () => useUIStore((state) => state.isSidebarCollapsed);
export const useIsMobileMenuOpen = () => useUIStore((state) => state.isMobileMenuOpen);
export const useIsSearchOpen = () => useUIStore((state) => state.isSearchOpen);
export const useSearchQuery = () => useUIStore((state) => state.searchQuery);
export const useModals = () => useUIStore((state) => state.modals);
export const useIsGlobalLoading = () => useUIStore((state) => state.isGlobalLoading);

/**
 * Check if a specific modal is open
 */
export const useIsModalOpen = (id: string) =>
  useUIStore((state) => state.modals.some((m) => m.id === id));

/**
 * Modal IDs for type safety
 */
export const MODAL_IDS = {
  LOGIN: 'login',
  REGISTER: 'register',
  SEARCH: 'search',
  VIDEO_PLAYER: 'video-player',
  SUBSCRIPTION_SELECT: 'subscription-select',
  PAYMENT: 'payment',
  VERIFICATION: 'verification',
  CONFIRM_DELETE: 'confirm-delete',
  ACCEPT_DOCUMENT: 'accept-document',
} as const;
