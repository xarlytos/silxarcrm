import type { AuthStore } from '../stores/authStore';
import { queryClient } from '../lib/queryClient';

export interface UseSalonOptions {
  store: AuthStore;
}

export function useSalon(options: UseSalonOptions) {
  const { store } = options;
  const memberships = store((s) => s.memberships);
  const currentSalonId = store((s) => s.currentSalonId);
  const setCurrentSalonId = store((s) => s.setCurrentSalonId);

  const currentMembership = memberships.find((m) => m.salon.id === currentSalonId) ?? null;
  const currentSalon = currentMembership?.salon ?? null;

  const switchSalon = (salonId: string) => {
    if (salonId === currentSalonId) return;
    setCurrentSalonId(salonId);
    queryClient.invalidateQueries();
  };

  return {
    memberships,
    currentSalon,
    currentMembership,
    switchSalon,
  };
}
