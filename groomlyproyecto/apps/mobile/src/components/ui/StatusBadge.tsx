import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { palette } from '@/theme/colors';

type StatusType = 'confirmada' | 'enCurso' | 'pendiente' | 'cancelada' | 'completada';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { color: string; label: string; pulse: boolean }> = {
  confirmada: { color: palette.status.confirmada, label: 'Confirmada', pulse: false },
  enCurso: { color: palette.status.enCurso, label: 'En curso', pulse: true },
  pendiente: { color: palette.status.pendiente, label: 'Pendiente', pulse: false },
  cancelada: { color: palette.status.cancelada, label: 'Cancelada', pulse: false },
  completada: { color: palette.status.completada, label: 'Completada', pulse: false },
};

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const { colors } = useTheme();
  const config = statusConfig[status];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!config.pulse) return;

    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [config.pulse]);

  const heights = { sm: 22, md: 28 };
  const fontSizes = { sm: 10, md: 12 };
  const paddings = { sm: { h: 8, v: 2 }, md: { h: 12, v: 4 } };

  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
      {config.pulse && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: config.color,
              borderRadius: 999,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      )}
      <View
        style={{
          backgroundColor: `${config.color}20`,
          borderWidth: 1,
          borderColor: `${config.color}40`,
          borderRadius: 999,
          paddingHorizontal: paddings[size].h,
          paddingVertical: paddings[size].v,
          height: heights[size],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: config.color,
            fontSize: fontSizes[size],
            fontWeight: '700',
            letterSpacing: 0.3,
          }}
        >
          {label || config.label}
        </Text>
      </View>
    </View>
  );
}
