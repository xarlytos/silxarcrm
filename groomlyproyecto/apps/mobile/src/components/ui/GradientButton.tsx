import { TouchableOpacity, Text, Animated, type TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useCallback } from 'react';
import { radius } from '@/theme/radius';

interface GradientButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  gradient?: [string, string];
}

export function GradientButton({
  children,
  size = 'md',
  isLoading,
  disabled,
  gradient = ['#00D4FF', '#7B61FF'],
  style,
  onPressIn,
  onPressOut,
  ...props
}: GradientButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback((e: any) => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
    onPressIn?.(e);
  }, [onPressIn, scale]);

  const handlePressOut = useCallback((e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
    onPressOut?.(e);
  }, [onPressOut, scale]);

  const sizes = {
    sm: { height: 36, fontSize: 14 },
    md: { height: 48, fontSize: 15 },
    lg: { height: 56, fontSize: 16 },
  };

  const s = sizes[size];

  return (
    <TouchableOpacity
      disabled={disabled || isLoading}
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ opacity: disabled || isLoading ? 0.5 : 1 }, style]}
      {...props}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height: s.height,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: '#0A0B10',
              fontWeight: '700',
              fontSize: s.fontSize,
              letterSpacing: 0.3,
            }}
          >
            {isLoading ? 'Cargando...' : children}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}
