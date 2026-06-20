import { TouchableOpacity, Animated, type TouchableOpacityProps } from 'react-native';
import { useSpringPress } from '@/hooks/useSpringPress';

interface AnimatedPressableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  springScale?: number;
}

export function AnimatedPressable({
  children,
  springScale = 0.96,
  onPressIn,
  onPressOut,
  style,
  ...props
}: AnimatedPressableProps) {
  const { scale, onPressIn: handlePressIn, onPressOut: handlePressOut } = useSpringPress({ scale: springScale });

  const handleOnPressIn = (e: any) => {
    handlePressIn();
    onPressIn?.(e);
  };

  const handleOnPressOut = (e: any) => {
    handlePressOut();
    onPressOut?.(e);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handleOnPressIn}
      onPressOut={handleOnPressOut}
      {...props}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
