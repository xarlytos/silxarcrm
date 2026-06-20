import { Stack } from 'expo-router';

export default function ClientesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#1f1f2c', fontWeight: '600' },
        headerTintColor: '#8636f4',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Ficha cliente' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar cliente' }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo cliente' }} />
    </Stack>
  );
}
