import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { User, AuthState } from '@/types';

export type AuthStore = AuthState & { _hasHydrated: boolean };

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        const response = await api.login(email, password);
        const { access_token, user } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        set({
          user,
          token: access_token,
          isAuthenticated: true,
          _hasHydrated: true,
        });
      },

      register: async (data) => {
        await api.register(data);
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setAuth: (token: string, user: User) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Mark store as hydrated after Zustand rehydrates from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Directly mutate the hydrated state (recommended for sync storage)
          (state as AuthStore)._hasHydrated = true;
        }
      },
    }
  )
);
