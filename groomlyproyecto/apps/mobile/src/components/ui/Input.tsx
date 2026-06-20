import { TextInput, type TextInputProps, View, Text, Platform } from 'react-native';
import { cn } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme/radius';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <View className="w-full">
      {label && (
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' }}>
          {label}
        </Text>
      )}
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderColor: error ? colors.error : colors.border,
          borderWidth: 1.5,
          borderRadius: radius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: isWeb ? 0 : 14,
        }}
      >
        {icon && <View style={{ marginRight: 12 }}>{icon}</View>}
        <TextInput
          style={[
            {
              flex: 1,
              color: colors.text,
              fontSize: 15,
              backgroundColor: colors.surfaceElevated,
              borderWidth: 0,
              outlineWidth: 0,
              paddingVertical: isWeb ? 14 : 0,
            },
            isWeb && {
              // Forzar estilos en web para evitar fondo blanco del navegador
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
            } as any,
            style,
          ]}
          className={cn(className)}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
      </View>
      {error && (
        <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
