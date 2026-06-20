import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  X,
  Home,
  Calendar,
  Users,
  PawPrint,
  DollarSign,
  Package,
  Settings,
  HelpCircle,
  LogOut,
  Percent,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import { useAuth } from '@/hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { icon: Home, label: 'Inicio', route: '/(staff)' },
  { icon: Calendar, label: 'Agenda', route: '/(staff)/agenda' },
  { icon: Users, label: 'Clientes', route: '/(staff)/clientes' },
  { icon: PawPrint, label: 'Mascotas', route: '/(staff)/mascotas' },
  { icon: DollarSign, label: 'Finanzas', route: '/(staff)/finanzas' },
  { icon: Percent, label: 'Comisiones', route: '/(staff)/comisiones' },
  { icon: Package, label: 'Inventario', route: '/(staff)/inventario' },
  { icon: Settings, label: 'Configuración', route: '/(staff)/mas' },
  { icon: HelpCircle, label: 'Ayuda', route: '' },
];

export function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [visible, setVisible] = useState(isOpen);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const navigate = useCallback(
    (route: string) => {
      if (route) {
        router.push(route as any);
      }
      onClose();
    },
    [router, onClose]
  );

  const handleLogout = useCallback(() => {
    onClose();
    logout();
  }, [onClose, logout]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim },
          ]}
        />
      </TouchableOpacity>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typography.label, { color: colors.primary }]}>
            GROOMLY
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => navigate(item.route)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <item.icon size={20} color={colors.textSecondary} />
              <Text
                style={[
                  styles.menuLabel,
                  { color: colors.text },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logout, { borderTopColor: colors.border }]}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={[styles.menuLabel, { color: colors.error }]}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  menuList: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 14,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
});
