import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';

interface GlowCardProps extends ViewProps {
  children: React.ReactNode;
  glowColor?: string;
  shadow?: 'sm' | 'md' | 'lg';
  borderRadius?: number;
}

export function GlowCard({
  children,
  glowColor,
  shadow = 'md',
  borderRadius = radius.lg,
  style,
  ...props
}: GlowCardProps) {
  const { colors } = useTheme();
  const glow = glowColor || colors.primaryGlow;

  return (
    <View style={[{ position: 'relative' }, style]} {...props}>
      {/* Glow layer */}
      <View
        style={{
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderRadius: borderRadius + 3,
          backgroundColor: glow,
        }}
      />
      {/* Card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows[shadow],
        }}
      >
        {children}
      </View>
    </View>
  );
}
