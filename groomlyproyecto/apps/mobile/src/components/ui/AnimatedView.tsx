import { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';

interface AnimatedViewProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  animation?: 'fade' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'bounce';
}

export function AnimatedView({
  children,
  delay = 0,
  duration = 400,
  animation = 'fade',
  style,
  ...props
}: AnimatedViewProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animation === 'bounce') {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(animatedValue, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
      ]).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const getStyle = () => {
    switch (animation) {
      case 'fade':
        return { opacity: animatedValue };
      case 'slideUp':
        return {
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        };
      case 'slideLeft':
        return {
          opacity: animatedValue,
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        };
      case 'slideRight':
        return {
          opacity: animatedValue,
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          }],
        };
      case 'bounce':
        return {
          opacity: animatedValue,
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
          }],
        };
      default:
        return { opacity: animatedValue };
    }
  };

  return (
    <Animated.View style={[getStyle(), style]} {...props}>
      {children}
    </Animated.View>
  );
}

/** Wrapper para listados con staggered animation */
export function AnimatedListItem({
  children,
  index = 0,
  animation = 'slideUp',
  staggerDelay = 80,
}: {
  children: React.ReactNode;
  index?: number;
  animation?: AnimatedViewProps['animation'];
  staggerDelay?: number;
}) {
  return (
    <AnimatedView delay={index * staggerDelay} animation={animation}>
      {children}
    </AnimatedView>
  );
}
