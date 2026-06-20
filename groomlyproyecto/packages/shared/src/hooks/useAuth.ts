import { useMutation } from '@tanstack/react-query';
import type { AuthStore } from '../stores/authStore';
import * as authService from '../services/auth.service';
import { queryClient } from '../lib/queryClient';

export interface UseAuthOptions {
  store: AuthStore;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export function useAuth(options: UseAuthOptions) {
  const { store, navigate } = options;
  const setSession = store((s) => s.setSession);
  const logoutStore = store((s) => s.logout);
  const token = store((s) => s.token);
  const user = store((s) => s.user);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setSession(data);
      const hasSalon = data.memberships.length > 0;
      navigate(hasSalon ? '/' : '/onboarding', { replace: true });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setSession(data);
      const hasSalon = data.memberships.length > 0;
      navigate(hasSalon ? '/' : '/onboarding', { replace: true });
    },
  });

  const logout = () => {
    logoutStore();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return {
    isAuthenticated: Boolean(token && user),
    user,
    login: loginMutation.mutateAsync,
    loginState: loginMutation,
    register: registerMutation.mutateAsync,
    registerState: registerMutation,
    logout,
  };
}
