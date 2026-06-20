import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import { GradientButton } from './GradientButton';
import { AnimatedView } from './AnimatedView';

interface EmptyStateProps {
  image: any;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  image,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  const s = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    imageContainer: {
      width: 180,
      height: 180,
      borderRadius: 90,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      marginBottom: 20,
    },
    image: {
      width: 200,
      height: 200,
      position: 'absolute',
      top: -10,
      left: -10,
    },
    imageOverlay: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 50,
      height: 50,
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: 24,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 280,
    },
    buttonContainer: {
      marginTop: 20,
      minWidth: 200,
    },
  });

  return (
    <AnimatedView animation="scale" delay={200}>
      <View style={s.container}>
        <View style={s.imageContainer}>
          <Image source={image} style={s.image} resizeMode="cover" />
          <View style={s.imageOverlay} pointerEvents="none" />
        </View>

        <Text style={s.title}>{title}</Text>

        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}

        {actionLabel && onAction && (
          <View style={s.buttonContainer}>
            <GradientButton size="md" onPress={onAction}>
              {actionLabel}
            </GradientButton>
          </View>
        )}
      </View>
    </AnimatedView>
  );
}
