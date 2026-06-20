import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface StoryCircleProps {
  image: any;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  size?: number;
}

export function StoryCircle({
  image,
  label,
  isActive = true,
  onPress,
  size = 64,
}: StoryCircleProps) {
  const { colors } = useTheme();

  const innerSize = size - 6;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ alignItems: 'center', marginRight: 12 }}
      activeOpacity={0.8}
    >
      {isActive ? (
        <LinearGradient
          colors={['#00D4FF', '#7B61FF']}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            padding: 3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: colors.background,
              padding: 2,
              overflow: 'hidden',
            }}
          >
            <Image
              source={image}
              style={{
                width: innerSize - 4,
                height: innerSize - 4,
                borderRadius: (innerSize - 4) / 2,
              }}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 2,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            overflow: 'hidden',
          }}
        >
          <Image
            source={image}
            style={{
              width: size - 8,
              height: size - 8,
              borderRadius: (size - 8) / 2,
            }}
            resizeMode="cover"
          />
        </View>
      )}
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: '500',
          marginTop: 6,
          maxWidth: size + 8,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
