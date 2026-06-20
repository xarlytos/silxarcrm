/**
 * SafeImage — Muestra imágenes ocultando la marca de agua de Gemini
 * en la esquina inferior derecha.
 *
 * Estrategia: Usa overflow: hidden + un recorte del 5% inferior/derecho
 * para que la marca quede fuera del viewport.
 */
import { Image, type ImageProps, View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  source: any;
  watermarkSafe?: boolean; // true por defecto
  fallbackSource?: any;
  borderRadius?: number;
}

export function SafeImage({
  source,
  watermarkSafe = true,
  fallbackSource,
  borderRadius = 0,
  style,
  resizeMode = 'cover',
  ...props
}: SafeImageProps) {
  const { colors } = useTheme();

  if (!watermarkSafe) {
    return (
      <Image
        source={source}
        style={[{ borderRadius }, style]}
        resizeMode={resizeMode}
        {...props}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { borderRadius, overflow: 'hidden' },
        style,
      ]}
    >
      <Image
        source={source}
        style={[
          StyleSheet.absoluteFill,
          styles.image,
        ]}
        resizeMode={resizeMode}
        defaultSource={fallbackSource}
        {...props}
      />
      {/* Overlay de gradiente que cubre la esquina inferior derecha */}
      <View
        style={[
          styles.cornerCover,
          {
            backgroundColor: colors.background,
            opacity: 0.95,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '105%',
    height: '105%',
    top: 0,
    left: 0,
  },
  cornerCover: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 48,
    height: 48,
    borderTopLeftRadius: 24,
  },
});
