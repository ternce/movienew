import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@movie-platform/shared';

/**
 * Sync auth state to cookies so Next.js middleware can detect authentication.
 * Middleware runs on the server and cannot read localStorage.
 */
function syncAuthCookies(accessToken: string | null, isAuthenticated: boolean) {
  if (typeof document === 'undefined') return;
  if (isAuthenticated && accessToken) {
    document.cookie = `mp-auth-token=${accessToken};path=/;max-age=${60 * 60 * 24 * 7};samesite=lax`;
    document.cookie = `mp-authenticated=true;path=/;max-age=${60 * 60 * 24 * 7};samesite=lax`;
  } else {
    document.cookie = 'mp-auth-token=;path=/;max-age=0';
    document.cookie = 'mp-authenticated=;path=/;max-age=0';
  }
}

/**
 * Authentication state interface
 */
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken?: string, sessionId?: string) => void;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken?: string, sessionId?: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

/**
 * Auth store with persistence
 * Uses skipHydration to prevent SSR hydration mismatches
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      isAuthenticated: false,
      isHydrated: false,

      // Set full auth state (after login)
      setAuth: (user, accessToken, refreshToken, sessionId) => {
        syncAuthCookies(accessToken, true);
        set({
          user,
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          sessionId: sessionId ?? get().sessionId,
          isAuthenticated: true,
        });
      },

      // Update user data
      setUser: (user) => set({ user }),

      // Update tokens (after refresh)
      setTokens: (accessToken, refreshToken, sessionId) => {
        syncAuthCookies(accessToken, true);
        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          sessionId: sessionId ?? get().sessionId,
        });
      },

      // Partial user update
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Clear auth state (logout)
      logout: () => {
        syncAuthCookies(null, false);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          isAuthenticated: false,
        });
      },

      // Mark store as hydrated — also sync cookies from persisted state
      setHydrated: (hydrated) => {
        if (hydrated) {
          const { accessToken, isAuthenticated } = get();
          syncAuthCookies(accessToken, isAuthenticated);
        }
        set({ isHydrated: hydrated });
      },
    }),
    {
      name: 'mp-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Skip hydration to prevent SSR mismatches
      // We manually rehydrate in the Providers component
      skipHydration: true,
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Selector hooks for common auth state
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAccessToken = () => useAuthStore((state) => state.accessToken);
export const useIsHydrated = () => useAuthStore((state) => state.isHydrated);

/**
 * Get auth state outside of React components
 */
export const getAuthState = () => useAuthStore.getState();
