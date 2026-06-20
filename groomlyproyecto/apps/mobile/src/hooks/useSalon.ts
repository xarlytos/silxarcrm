import { useSalon as useSharedSalon } from '@groomly/shared';
import { useAuthStore } from '../stores/authStore';

export function useSalon() {
  return useSharedSalon({ store: useAuthStore });
}
