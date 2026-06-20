import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface SpringConfig {
  friction?: number;
  tension?: number;
  scale?: number;
}

export function useSpringPress(config: SpringConfig = {}) {
  const {
    friction = 8,
    tension = 100,
    scale = 0.96,
  } = config;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: scale,
      useNativeDriver: true,
      friction,
      tension,
    }).start();
  }, [scaleAnim, scale, friction, tension]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction,
      tension,
    }).start();
  }, [scaleAnim, friction, tension]);

  return { scale: scaleAnim, onPressIn, onPressOut };
}
