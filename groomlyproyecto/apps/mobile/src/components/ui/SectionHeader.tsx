import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  dotColor?: string;
}

export function SectionHeader({ title, action, dotColor }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 8,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          backgroundColor: dotColor || colors.primary,
          transform: [{ rotate: '45deg' }],
          marginRight: 10,
          borderRadius: 1,
        }}
      />
      <Text
        style={{
          ...typography.h2,
          color: colors.text,
          flex: 1,
        }}
      >
        {title}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 13,
              fontWeight: '600',
              marginRight: 2,
            }}
          >
            {action.label}
          </Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
