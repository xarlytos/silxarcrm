import { Stack } from 'expo-router';

export default function FinanzasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#1f1f2c', fontWeight: '600' },
        headerTintColor: '#8636f4',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ title: 'Facturas' }} />
      <Stack.Screen name="invoices/[id]" options={{ title: 'Detalle factura' }} />
      <Stack.Screen name="expenses" options={{ title: 'Gastos' }} />
      <Stack.Screen name="expenses/new" options={{ title: 'Nuevo gasto' }} />
    </Stack>
  );
}
