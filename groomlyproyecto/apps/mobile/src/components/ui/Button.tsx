import { TouchableOpacity, Text, Animated, View, type TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useCallback } from 'react';
import { radius } from '@/theme/radius';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
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
    sm: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    md: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
    lg: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 16 },
  };

  const s = sizes[size];
  const isGradient = variant === 'gradient';

  return (
    <TouchableOpacity
      style={[{ width: '100%' }, style]}
      disabled={disabled || isLoading}
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: radius.lg,
          overflow: 'hidden',
          opacity: disabled || isLoading ? 0.5 : 1,
        }}
      >
        {isGradient && (
          <LinearGradient
            colors={['#00D4FF', '#7B61FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: radius.lg,
            }}
          />
        )}
        <View
          style={{
            backgroundColor: isGradient ? 'transparent' : getBgColor(variant),
            borderRadius: radius.lg,
            paddingHorizontal: s.paddingHorizontal,
            paddingVertical: s.paddingVertical,
            alignItems: 'center',
            justifyContent: 'center',
            ...getBorder(variant),
          }}
        >
          <Text
            style={{
              color: getTextColor(variant),
              fontWeight: '700',
              fontSize: s.fontSize,
              letterSpacing: 0.3,
              zIndex: 1,
            }}
          >
            {isLoading ? 'Cargando...' : children}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function getBgColor(variant: string): string {
  switch (variant) {
    case 'primary': return '#00D4FF';
    case 'secondary': return '#1C1E2A';
    case 'outline': return 'transparent';
    case 'ghost': return 'transparent';
    case 'danger': return '#FF4D6D';
    default: return '#00D4FF';
  }
}

function getTextColor(variant: string): string {
  switch (variant) {
    case 'primary': return '#0A0B10';
    case 'secondary': return '#FFFFFF';
    case 'outline': return '#00D4FF';
    case 'ghost': return '#00D4FF';
    case 'danger': return '#FFFFFF';
    case 'gradient': return '#0A0B10';
    default: return '#0A0B10';
  }
}

function getBorder(variant: string) {
  if (variant === 'outline') {
    return { borderWidth: 1.5, borderColor: '#00D4FF' };
  }
  if (variant === 'secondary') {
    return { borderWidth: 1, borderColor: '#252836' };
  }
  return {};
}
