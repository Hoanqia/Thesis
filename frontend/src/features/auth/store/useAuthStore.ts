import { create } from 'zustand';
import { axiosRequest } from '@/lib/axiosRequest';
import { handleLogout } from '../api/logout';

type AuthStore = {
  isLoggedIn: boolean;
  checkAuth: () => Promise<void>;
  isAuthChecked: boolean;
  logout: () => Promise<void>;
  setIsLoggedIn: (value: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  isAuthChecked: false,

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
    finally {
            set({ isAuthChecked: true }); // ✅ Đánh dấu đã kiểm tra xong
    }
  },

  logout: async () => {
    await handleLogout();
    set({ isLoggedIn: false });
  },
}));
