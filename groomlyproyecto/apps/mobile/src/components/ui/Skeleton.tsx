import { useEffect, useRef } from 'react';
import { Animated, View, type ViewProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme/radius';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  className,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, []);

  const borderRadius = circle ? (typeof height === 'number' ? height / 2 : 8) : radius.sm;
  const bgColor = colors.isDark ? '#1C1E2A' : '#E8EBF0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity,
        },
        style,
      ]}
      className={className}
    />
  );
}

/** Skeleton para una fila de lista (avatar + texto) */
export function SkeletonListItem() {
  return (
    <View className="flex-row items-center py-3">
      <Skeleton width={48} height={48} circle />
      <View className="flex-1 ml-3 gap-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

/** Skeleton para tarjeta con stats */
export function SkeletonStatCard() {
  return (
    <View className="flex-1 items-center py-4">
      <Skeleton width={60} height={28} />
      <Skeleton width={80} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Skeleton para dashboard completo */
export function SkeletonDashboard() {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16, paddingVertical: 16 }}>
      {/* Header */}
      <View className="flex-row justify-between items-center">
        <Skeleton width={140} height={28} />
        <View className="flex-row gap-2">
          <Skeleton width={40} height={40} circle />
          <Skeleton width={40} height={40} circle />
        </View>
      </View>

      {/* Hero card skeleton */}
      <Skeleton width="100%" height={200} style={{ borderRadius: radius.xl }} />

      {/* Stats row */}
      <View className="flex-row gap-3">
        <View className="flex-1 items-center py-4" style={{ backgroundColor: colors.surface, borderRadius: radius.lg }}>
          <Skeleton width={60} height={32} />
          <Skeleton width={80} height={14} style={{ marginTop: 8 }} />
        </View>
        <View className="flex-1 items-center py-4" style={{ backgroundColor: colors.surface, borderRadius: radius.lg }}>
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={14} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Quick actions skeleton */}
      <View className="flex-row flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="items-center py-4" style={{ width: '23%', backgroundColor: colors.surface, borderRadius: radius.lg }}>
            <Skeleton width={48} height={48} circle />
            <Skeleton width={50} height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Section header */}
      <Skeleton width="30%" height={18} />

      {/* List items */}
      <SkeletonListItem />
      <SkeletonListItem />
      <SkeletonListItem />
    </View>
  );
}

/** Skeleton para lista de citas */
export function SkeletonAppointmentList() {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="flex-row items-center py-3 px-4" style={{ backgroundColor: '#1C1E2A', borderRadius: radius.lg }}>
          <Skeleton width={48} height={48} circle />
          <View className="flex-1 ml-3 gap-2">
            <View className="flex-row justify-between">
              <Skeleton width="40%" height={16} />
              <Skeleton width={60} height={22} style={{ borderRadius: radius.full }} />
            </View>
            <Skeleton width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton para HeroCard */
export function SkeletonHeroCard() {
  return (
    <View>
      <Skeleton width="100%" height={160} style={{ borderRadius: radius.xl }} />
      <View style={{ padding: 16, gap: 8, marginTop: -60 }}>
        <Skeleton width={100} height={22} style={{ borderRadius: radius.full }} />
        <Skeleton width="80%" height={24} />
        <Skeleton width="60%" height={14} />
        <Skeleton width="100%" height={48} style={{ borderRadius: radius.lg, marginTop: 8 }} />
      </View>
    </View>
  );
}
