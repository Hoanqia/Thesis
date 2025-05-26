import { create } from 'zustand';
import { axiosRequest } from '@/lib/axiosRequest';
import { handleLogout } from '../api/logout';

type AuthStore = {
  isLoggedIn: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setIsLoggedIn: (value: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,

  setIsLoggedIn: (value: boolean) => set({ isLoggedIn: value }),

  checkAuth: async () => {
    try {
      const res = await axiosRequest('auth/me', 'GET');
      if (res?.user) {
        set({ isLoggedIn: true });
      } else {
        set({ isLoggedIn: false });
      }
    } catch (error) {
      console.error('Auth check failed', error);
      set({ isLoggedIn: false });
    }
  },

  logout: async () => {
    await handleLogout();
    set({ isLoggedIn: false });
  },
}));
