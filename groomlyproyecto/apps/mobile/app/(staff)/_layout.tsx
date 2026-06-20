import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function StaffLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="clientes" />
      <Tabs.Screen name="mas" />
      <Tabs.Screen name="mascotas" />
      <Tabs.Screen name="notificaciones" />
      <Tabs.Screen name="equipo" />
      <Tabs.Screen name="finanzas" />
      <Tabs.Screen name="comisiones" />
      <Tabs.Screen name="inventario" />
    </Tabs>
  );
}
