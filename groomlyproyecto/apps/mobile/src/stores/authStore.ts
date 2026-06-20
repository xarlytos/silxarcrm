import { storage } from '@/lib/storage';
import { createAuthStore, type AuthStore } from '@groomly/shared';

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return storage.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await storage.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await storage.deleteItemAsync(name);
  },
};

export const useAuthStore: AuthStore = createAuthStore({
  storage: secureStorage,
  storageKey: 'groomly-auth-mobile',
});
