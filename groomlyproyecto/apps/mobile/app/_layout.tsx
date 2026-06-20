import '../src/lib/api'; // Inicializar API primero
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { asyncStoragePersister } from '@groomly/shared';
import { queryClient } from '@groomly/shared';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Linking, StatusBar } from 'react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NetworkStatusBar } from '@/components/NetworkStatusBar';
import '../src/global.css';

function AppContent() {
  const router = useRouter();
  const { registerForPushNotifications } = useNotifications();
  const token = useAuthStore((s) => s.token);
  const { colors } = useTheme();

  useEffect(() => {
    if (token) {
      registerForPushNotifications();
    }
  }, [token]);

  // Deep linking handler
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const match = url.match(/^peluguau:\/\/(.+)$/);
      if (!match) return;
      const path = match[1];
      if (path.startsWith('agenda/')) {
        router.push(`/(staff)/agenda/${path.replace('agenda/', '')}`);
      } else if (path.startsWith('clientes/')) {
        router.push(`/(staff)/clientes/${path.replace('clientes/', '')}`);
      } else if (path.startsWith('mascotas/')) {
        router.push(`/(staff)/mascotas/${path.replace('mascotas/', '')}`);
      } else if (path.startsWith('invoice/')) {
        router.push(`/(staff)/finanzas/invoices/${path.replace('invoice/', '')}`);
      } else if (path === 'agenda') {
        router.push('/(staff)/agenda');
      } else if (path === 'finanzas') {
        router.push('/(staff)/finanzas');
      } else if (path === 'notificaciones') {
        router.push('/(staff)/notificaciones');
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => { subscription.remove(); };
  }, [router]);

  return (
    <>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <NetworkStatusBar />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(staff)" />
        <Stack.Screen name="(client)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
