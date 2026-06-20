import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/hooks/useSalon';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import {
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  DollarSign,
  Moon,
  Sun,
  Users,
  Package,
  Percent,
} from 'lucide-react-native';

export default function MasPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentSalon, memberships, switchSalon } = useSalon();
  const { isDark, toggleTheme, colors } = useTheme();

  const menuItems = [
    { icon: DollarSign, label: 'Finanzas', onPress: () => router.push('/(staff)/finanzas') },
    { icon: Percent, label: 'Comisiones', onPress: () => router.push('/(staff)/comisiones') },
    { icon: Package, label: 'Inventario', onPress: () => router.push('/(staff)/inventario') },
    { icon: Users, label: 'Equipo', onPress: () => router.push('/(staff)/equipo') },
    { icon: User, label: 'Mi perfil', onPress: () => {} },
    { icon: Settings, label: 'Configuración del salón', onPress: () => {} },
    { icon: CreditCard, label: 'Facturación', onPress: () => {} },
    { icon: HelpCircle, label: 'Ayuda', onPress: () => {} },
  ];

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ ...typography.label, color: colors.primary, textTransform: 'uppercase' }}>
            MÁS OPCIONES
          </Text>
        </View>

        {/* User card */}
        <Card style={styles.userCard}>
          <View style={styles.row}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: `${colors.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
                {(user?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                {user?.email}
              </Text>
            </View>
          </View>
        </Card>

        {/* Salon switcher */}
        {memberships.length > 1 && (
          <>
            <SectionHeader title="Tus salones" />
            <Card style={styles.salonCard}>
              {memberships.map((m, i) => (
                <AnimatedPressable
                  key={m.salon.id}
                  onPress={() => switchSalon(m.salon.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: i < memberships.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: m.salon.id === currentSalon?.id ? colors.primary : colors.textMuted,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: m.salon.id === currentSalon?.id ? colors.text : colors.textSecondary,
                      fontWeight: m.salon.id === currentSalon?.id ? '600' : '400',
                      fontSize: 15,
                    }}
                  >
                    {m.salon.name}
                  </Text>
                  {m.salon.id === currentSalon?.id && (
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      Activo
                    </Text>
                  )}
                </AnimatedPressable>
              ))}
            </Card>
          </>
        )}

        {/* Theme toggle */}
        <SectionHeader title="Apariencia" />
        <Card style={styles.themeCard}>
          <AnimatedPressable
            onPress={toggleTheme}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            {isDark ? (
              <>
                <Moon size={20} color={colors.textSecondary} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 15, marginLeft: 12 }}>
                  Modo oscuro
                </Text>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.primary,
                    padding: 2,
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
                </View>
              </>
            ) : (
              <>
                <Sun size={20} color={colors.textSecondary} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 15, marginLeft: 12 }}>
                  Modo claro
                </Text>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.border,
                    padding: 2,
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
                </View>
              </>
            )}
          </AnimatedPressable>
        </Card>

        {/* Menu */}
        <SectionHeader title="Menú" />
        <Card style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <AnimatedPressable
              key={i}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: i < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <item.icon size={20} color={colors.textSecondary} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 15, marginLeft: 12 }}>
                {item.label}
              </Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </AnimatedPressable>
          ))}
        </Card>

        {/* Logout */}
        <AnimatedPressable
          onPress={logout}
          style={styles.logoutButton}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={{ color: colors.error, marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            Cerrar sesión
          </Text>
        </AnimatedPressable>

        <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 11, marginBottom: 20 }}>
          Groomly v1.0.0 · peluguau.com
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
  },
  userCard: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  salonCard: {
    marginBottom: 16,
  },
  themeCard: {
    marginBottom: 16,
  },
  menuCard: {
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
});