import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClientPerfilPage() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const menuItems = [
    { icon: User, label: 'Editar perfil' },
    { icon: Settings, label: 'Preferencias' },
    { icon: Bell, label: 'Notificaciones' },
    { icon: HelpCircle, label: 'Ayuda' },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Mi perfil</Text>

        {/* User card */}
        <Card style={styles.userCard}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(user?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: colors.text }]}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Menu */}
        <Card style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.menuItem,
                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <item.icon size={20} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout */}
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 16,
  },
  userCard: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  menuCard: {
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
});
