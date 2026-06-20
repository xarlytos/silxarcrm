import { createApi } from '@groomly/shared';
import { useAuthStore } from '../stores/authStore';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = createApi({
  baseURL: API_URL,
  getAuthState: () => useAuthStore.getState(),
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    router.replace('/login');
  },
  isPublicRoute: () => {
    // En mobile, las rutas públicas se manejan diferente
    // El guard ya filtra antes de llegar aquí
    return false;
  },
});
