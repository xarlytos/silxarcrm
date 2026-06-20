import { Stack } from 'expo-router';

export default function AgendaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#1f1f2c', fontWeight: '600' },
        headerTintColor: '#8636f4',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle cita' }} />
      <Stack.Screen name="new" options={{ title: 'Nueva cita' }} />
    </Stack>
  );
}
