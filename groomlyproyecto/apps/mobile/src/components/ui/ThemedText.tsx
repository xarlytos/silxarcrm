import { Text, type TextProps } from 'react-native';
import { cn } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { typography, type TypographyStyle } from '@/theme/typography';

interface ThemedTextProps extends TextProps {
  variant?: 'body' | 'title' | 'subtitle' | 'muted' | 'inverse' | 'brand' | 'brandMuted' | 'success' | 'warning' | 'error' | 'secondary';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | TypographyStyle;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export function ThemedText({
  variant = 'body',
  size = 'base',
  weight = 'normal',
  className,
  style,
  ...props
}: ThemedTextProps) {
  const { colors } = useTheme();

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const getColor = () => {
    switch (variant) {
      case 'body': return colors.text;
      case 'title': return colors.text;
      case 'subtitle': return colors.textSecondary;
      case 'muted': return colors.textMuted;
      case 'inverse': return colors.textInverse;
      case 'brand': return colors.primary;
      case 'brandMuted': return 'rgba(0, 212, 255, 0.6)';
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      case 'secondary': return colors.textSecondary;
      default: return colors.text;
    }
  };

  // Check if size is a typography key
  const typographyKeys = Object.keys(typography);
  const isTypographySize = typographyKeys.includes(size);

  const typographyStyle = isTypographySize ? typography[size as TypographyStyle] : undefined;

  return (
    <Text
      style={[
        { color: getColor() },
        typographyStyle,
        style,
      ]}
      className={cn(
        !isTypographySize && sizeClasses[size as keyof typeof sizeClasses],
        weightClasses[weight],
        className
      )}
      {...props}
    />
  );
}
