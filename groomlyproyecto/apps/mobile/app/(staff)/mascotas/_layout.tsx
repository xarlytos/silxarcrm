import { Stack } from 'expo-router';

export default function MascotasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#1f1f2c', fontWeight: '600' },
        headerTintColor: '#8636f4',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Ficha mascota' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar mascota' }} />
      <Stack.Screen name="new" options={{ title: 'Nueva mascota' }} />
    </Stack>
  );
}
