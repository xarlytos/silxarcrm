import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { SafeImage } from './SafeImage';
import { StatusBadge } from './StatusBadge';
import { GradientButton } from './GradientButton';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  time?: string;
  status?: 'confirmada' | 'enCurso' | 'pendiente' | 'cancelada';
  imageSource?: any;
  onActionPress?: () => void;
  actionLabel?: string;
}

export function HeroCard({
  title,
  subtitle,
  time,
  status,
  imageSource,
  onActionPress,
  actionLabel = 'Ver detalles',
}: HeroCardProps) {
  const { colors } = useTheme();

  return (
    <View style={{ position: 'relative', marginBottom: 16 }}>
      {/* Glow sutil detrás */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.primaryGlow,
            borderRadius: radius.xl,
            transform: [{ scale: 1.02 }],
          },
        ]}
      />

      <View
        style={{
          borderRadius: radius.xl,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Imagen de fondo con gradiente de legibilidad */}
        {imageSource ? (
          <View style={{ height: 180, position: 'relative' }}>
            <SafeImage
              source={imageSource}
              style={StyleSheet.absoluteFill}
              watermarkSafe
              borderRadius={0}
            />
            <LinearGradient
              colors={gradients.legibility}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View
            style={{
              height: 120,
              backgroundColor: colors.surfaceElevated,
            }}
          >
            <LinearGradient
              colors={['rgba(0, 212, 255, 0.1)', 'rgba(123, 97, 255, 0.05)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* Contenido superpuesto */}
        <View style={{ padding: 16, paddingTop: imageSource ? 0 : 16 }}>
          {status && (
            <View style={{ marginBottom: 8, marginTop: imageSource ? -30 : 0 }}>
              <StatusBadge status={status} />
            </View>
          )}

          <Text
            style={{
              ...typography.h1,
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {title}
          </Text>

          {subtitle && (
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              {subtitle}
            </Text>
          )}

          {time && (
            <Text
              style={{
                ...typography.caption,
                color: colors.primary,
                marginBottom: 12,
              }}
            >
              {time}
            </Text>
          )}

          {onActionPress && (
            <GradientButton
              size="md"
              onPress={onActionPress}
              style={{ marginTop: 8 }}
            >
              {actionLabel}
            </GradientButton>
          )}
        </View>
      </View>
    </View>
  );
}

const gradients = {
  legibility: ['transparent', 'rgba(10, 11, 16, 0.7)', 'rgba(10, 11, 16, 0.95)'] as const,
};
