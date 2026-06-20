import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { selectIsAuthenticated } from '@groomly/shared';
import { useAuthStore } from '@/stores/authStore';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s: ReturnType<typeof useAuthStore.getState>) => s.user);
  const memberships = useAuthStore((s: ReturnType<typeof useAuthStore.getState>) => s.memberships);

  useEffect(() => {
    // Pequeño delay para que el splash screen no parpadee
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      // Si es admin de plataforma, va a staff
      if (user?.isPlatformAdmin) {
        router.replace('/(staff)');
        return;
      }

      // Detectar rol para redirigir
      const hasStaffRole = memberships.some((m: typeof memberships[0]) =>
        ['OWNER', 'MANAGER', 'GROOMER', 'RECEPTIONIST'].includes(m.role)
      );

      const hasCustomerRole = memberships.some((m: typeof memberships[0]) => m.role === 'CUSTOMER');

      if (hasStaffRole) {
        router.replace('/(staff)');
      } else if (hasCustomerRole) {
        router.replace('/(client)');
      } else {
        // Fallback: staff
        router.replace('/(staff)');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, memberships]);

  return (
    <Screen style={styles.container}>
      <View style={styles.center}>
        <Text style={[styles.brand, { color: colors.primary }]}>peluguau</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          ERP para peluquerías caninas
        </Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  brand: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
});
