import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'groomly-biometric-enabled';
const BIOMETRIC_EMAIL_KEY = 'groomly-biometric-email';
const BIOMETRIC_TOKEN_KEY = 'groomly-biometric-token';

const isWeb = Platform.OS === 'web';

// Fallback localStorage para web (expo-secure-store no funciona en web)
const webStore = {
  getItemAsync: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silenciar errores de localStorage
    }
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silenciar errores de localStorage
    }
  },
};

const store = isWeb ? webStore : SecureStore;

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAvailability();
    loadPreferences();
  }, []);

  const checkAvailability = async () => {
    // En web, la biometría no está disponible
    if (isWeb) {
      setIsAvailable(false);
      return;
    }
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsAvailable(compatible && enrolled);
  };

  const loadPreferences = async () => {
    try {
      const enabled = await store.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const email = await store.getItemAsync(BIOMETRIC_EMAIL_KEY);
      setIsEnabled(enabled === 'true');
      setSavedEmail(email);
    } catch {
      // Silenciar errores
      setIsEnabled(false);
      setSavedEmail(null);
    }
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (isWeb) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autenticarse en peluguau',
      fallbackLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });
    return result.success;
  }, []);

  const enableBiometric = useCallback(async (email: string, token?: string) => {
    if (isWeb) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Configurar acceso con biometría',
      fallbackLabel: 'Usar contraseña',
    });

    if (result.success) {
      await store.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      await store.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
      if (token) {
        await store.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
      }
      setIsEnabled(true);
      setSavedEmail(email);
      return true;
    }
    return false;
  }, []);

  const disableBiometric = useCallback(async () => {
    await store.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await store.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await store.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    setIsEnabled(false);
    setSavedEmail(null);
  }, []);

  /** Intenta recuperar un token guardado para auto-login */
  const getStoredToken = useCallback(async (): Promise<string | null> => {
    if (isWeb) return null;
    const success = await authenticate();
    if (success) {
      return store.getItemAsync(BIOMETRIC_TOKEN_KEY);
    }
    return null;
  }, [authenticate]);

  return {
    isAvailable,
    isEnabled,
    savedEmail,
    authenticate,
    enableBiometric,
    disableBiometric,
    getStoredToken,
  };
}
