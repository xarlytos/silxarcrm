import { View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AvatarProps {
  image?: any;
  initials?: string;
  size?: number;
  borderColor?: string;
  fallbackSource?: any;
}

function Avatar({ image, initials, size = 40, borderColor, fallbackSource }: AvatarProps) {
  const { colors } = useTheme();
  const bg = colors.surfaceElevated;
  const textColor = colors.primary;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: borderColor || colors.background,
        overflow: 'hidden',
      }}
    >
      {image ? (
        <View style={{ width: size, height: size }}>
          {/* Usar Image directo sin SafeImage para avatares pequeños */}
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: `${colors.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: textColor,
                fontWeight: '700',
                fontSize: size * 0.4,
              }}
            >
              {initials}
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={{
            color: textColor,
            fontWeight: '700',
            fontSize: size * 0.4,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

interface AvatarStackProps {
  avatars: Array<{
    image?: any;
    initials?: string;
  }>;
  size?: number;
  maxVisible?: number;
  overlap?: number;
}

export function AvatarStack({
  avatars,
  size = 40,
  maxVisible = 3,
  overlap = 12,
}: AvatarStackProps) {
  const { colors } = useTheme();
  const visible = avatars.slice(0, maxVisible);
  const remaining = avatars.length - maxVisible;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((avatar, index) => (
        <View
          key={index}
          style={{
            marginLeft: index > 0 ? -overlap : 0,
            zIndex: visible.length - index,
          }}
        >
          <Avatar
            image={avatar.image}
            initials={avatar.initials}
            size={size}
            borderColor={colors.background}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={{
            marginLeft: -overlap,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontWeight: '600',
              fontSize: size * 0.35,
            }}
          >
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}
