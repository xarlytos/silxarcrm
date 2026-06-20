import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { shadows } from '@/theme/shadows';

interface TabItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  badge?: number;
}

interface AnimatedTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function AnimatedTabBar({ tabs, activeKey, onChange }: AnimatedTabBarProps) {
  const { colors } = useTheme();
  const [indicatorX] = useState(new Animated.Value(0));
  const tabWidth = 100 / tabs.length;
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 12,
      tension: 120,
    }).start();
  }, [activeIndex, indicatorX]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 6,
        paddingBottom: 8,
        height: 64,
        flexDirection: 'row',
        ...shadows.md,
      }}
    >
      {/* Indicador animado */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 6,
          width: `${tabWidth}%`,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.primary,
          transform: [{
            translateX: indicatorX.interpolate({
              inputRange: tabs.map((_, i) => i),
              outputRange: tabs.map((_, i) => i * (tabWidth / 100) * 100), // Simplificado
            }),
          }],
        }}
        pointerEvents="none"
      />

      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Icon size={22} color={isActive ? colors.primary : colors.textMuted} />
              {tab.badge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -8,
                    backgroundColor: colors.error,
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: colors.surface,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.primary : colors.textMuted,
                marginTop: 3,
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
