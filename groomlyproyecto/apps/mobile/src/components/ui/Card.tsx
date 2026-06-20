import { View, type ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { shadows } from '@/theme/shadows';
import { radius } from '@/theme/radius';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  glow?: 'primary' | 'accent' | 'success' | 'error' | 'none';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Card({
  children,
  style,
  glow = 'none',
  shadow = 'md',
  radius: radiusKey = 'lg',
  ...props
}: CardProps) {
  const { colors } = useTheme();

  const glowColors = {
    primary: 'rgba(0, 212, 255, 0.08)',
    accent: 'rgba(123, 97, 255, 0.08)',
    success: 'rgba(0, 255, 136, 0.08)',
    error: 'rgba(255, 77, 109, 0.08)',
    none: 'transparent',
  };

  const showGlow = glow !== 'none';
  const r = radius[radiusKey] || radius.lg;

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    glow: {
      position: 'absolute',
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      borderRadius: r + 2,
      backgroundColor: glowColors[glow],
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: r,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={[styles.container, style]} {...props}>
      {showGlow && <View style={styles.glow} />}
      <View style={[styles.card, shadow !== 'none' ? shadows[shadow] : {}]}>
        {children}
      </View>
    </View>
  );
}
