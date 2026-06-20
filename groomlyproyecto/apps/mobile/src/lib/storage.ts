import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

/**
 * Storage universal: SecureStore en mobile, localStorage en web.
 * Expo SecureStore no funciona en web.
 */
export const storage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Silenciar
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silenciar
    }
  },

  deleteItemAsync: async (key: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Silenciar
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silenciar
    }
  },
};
