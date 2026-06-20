import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react-native';

export function NetworkStatusBar() {
  const { isOffline } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -40,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          backgroundColor: '#f59e0b',
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WifiOff size={16} color="#fff" />
        <Text
          style={{
            color: '#fff',
            fontWeight: '600',
            fontSize: 13,
            marginLeft: 8,
          }}
        >
          Sin conexión · Modo offline
        </Text>
      </View>
    </Animated.View>
  );
}
