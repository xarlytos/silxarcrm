import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { AuthState } from '../stores/authStore';

export interface ApiConfig {
  baseURL: string;
  getAuthState: () => AuthState;
  onUnauthorized?: () => void;
  isPublicRoute?: () => boolean;
}

let apiInstance: AxiosInstance | null = null;

export function createApi(config: ApiConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - inyecta token y X-Salon-Id
  instance.interceptors.request.use((reqConfig) => {
    const state = config.getAuthState();

    if (state.token) {
      reqConfig.headers.set('Authorization', `Bearer ${state.token}`);
    }

    if (state.currentSalonId) {
      reqConfig.headers.set('X-Salon-Id', state.currentSalonId);
    }

    return reqConfig;
  });

  // Response interceptor - manejo global de 401
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        const isPublic = config.isPublicRoute?.() ?? false;
        if (!isPublic) {
          config.onUnauthorized?.();
        }
      }
      return Promise.reject(error);
    },
  );

  apiInstance = instance;
  return instance;
}

export function getApi(): AxiosInstance {
  if (!apiInstance) {
    throw new Error('API not initialized. Call createApi(config) first.');
  }
  return apiInstance;
}

export interface ApiErrorResponse {
  error?: {
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export function extractErrorMessage(err: unknown, fallback = 'Algo salió mal'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    return data?.error?.message ?? data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
