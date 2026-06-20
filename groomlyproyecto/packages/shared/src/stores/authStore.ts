import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { User, Membership } from '../types/api';

export interface AuthState {
  token: string | null;
  user: User | null;
  memberships: Membership[];
  currentSalonId: string | null;
}

interface AuthActions {
  setSession: (params: { token: string; user: User; memberships: Membership[] }) => void;
  setUser: (user: User) => void;
  setMemberships: (memberships: Membership[]) => void;
  setCurrentSalonId: (salonId: string | null) => void;
  logout: () => void;
}

const initialState: AuthState = {
  token: null,
  user: null,
  memberships: [],
  currentSalonId: null,
};

export interface AuthStoreOptions {
  storage?: StateStorage;
  storageKey?: string;
}

export function createAuthStore(options: AuthStoreOptions = {}) {
  const { storage, storageKey = 'groomly-auth' } = options;

  return create<AuthState & AuthActions>()(
    persist(
      (set) => ({
        ...initialState,

        setSession: ({ token, user, memberships }) => {
          const currentSalonId = memberships[0]?.salon.id ?? null;
          set({ token, user, memberships, currentSalonId });
        },

        setUser: (user) => set({ user }),

        setMemberships: (memberships) =>
          set((state) => {
            const stillMember = memberships.some((m) => m.salon.id === state.currentSalonId);
            return {
              memberships,
              currentSalonId: stillMember ? state.currentSalonId : memberships[0]?.salon.id ?? null,
            };
          }),

        setCurrentSalonId: (salonId) => set({ currentSalonId: salonId }),

        logout: () => set({ ...initialState }),
      }),
      {
        name: storageKey,
        storage: storage ? createJSONStorage(() => storage) : undefined,
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          memberships: state.memberships,
          currentSalonId: state.currentSalonId,
        }),
      },
    ),
  );
}

// Exportar type para usar en hooks
export type AuthStore = ReturnType<typeof createAuthStore>;

export const selectIsAuthenticated = (s: AuthState) => Boolean(s.token && s.user);
export const selectCurrentMembership = (s: AuthState) =>
  s.memberships.find((m) => m.salon.id === s.currentSalonId) ?? null;
