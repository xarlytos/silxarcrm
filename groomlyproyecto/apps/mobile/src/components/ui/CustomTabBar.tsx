import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'expo-router';
import { Home, Calendar, Users, DollarSign } from 'lucide-react-native';

const TABS = [
  { name: 'index', label: 'Inicio', icon: Home },
  { name: 'agenda', label: 'Agenda', icon: Calendar },
  { name: 'clientes', label: 'Clientes', icon: Users },
  { name: 'finanzas', label: 'Finanzas', icon: DollarSign },
];

export function CustomTabBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const styles = StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      paddingBottom: 8,
      height: 64,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 11,
      marginTop: 4,
      fontWeight: '500',
    },
  });

  const isActive = (tabName: string) => {
    if (tabName === 'index') return pathname === '/(staff)' || pathname === '/(staff)/';
    return pathname.startsWith(`/(staff)/${tabName}`);
  };

  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(`/(staff)/${tab.name === 'index' ? '' : tab.name}`)}
            activeOpacity={0.7}
          >
            <Icon size={22} color={active ? colors.primary : colors.textMuted} />
            <Text style={[styles.label, { color: active ? colors.primary : colors.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
