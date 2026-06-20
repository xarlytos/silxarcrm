import { useAuth as useSharedAuth } from '@groomly/shared';
import { useAuthStore } from '../stores/authStore';
import { router } from 'expo-router';

export function useAuth() {
  return useSharedAuth({
    store: useAuthStore,
    navigate: (path, options) => {
      if (options?.replace) {
        router.replace(path as any);
      } else {
        router.push(path as any);
      }
    },
  });
}
