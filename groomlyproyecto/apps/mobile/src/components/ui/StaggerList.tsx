import { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';

interface StaggerItemProps extends ViewProps {
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  animation?: 'slideUp' | 'fade' | 'scale' | 'slideRight';
  duration?: number;
}

export function StaggerItem({
  children,
  index,
  staggerDelay = 60,
  animation = 'slideUp',
  duration = 350,
  style,
  ...props
}: StaggerItemProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay: index * staggerDelay,
      useNativeDriver: true,
    }).start();
  }, []);

  const getStyle = () => {
    switch (animation) {
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
      case 'slideRight':
        return {
          opacity: animatedValue,
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        };
      case 'fade':
        return { opacity: animatedValue };
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

interface StaggerListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  animation?: 'slideUp' | 'fade' | 'scale' | 'slideRight';
}

export function StaggerList({ children, staggerDelay = 60, animation = 'slideUp' }: StaggerListProps) {
  return (
    <>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <StaggerItem key={index} index={index} staggerDelay={staggerDelay} animation={animation}>
              {child}
            </StaggerItem>
          ))
        : children}
    </>
  );
}
