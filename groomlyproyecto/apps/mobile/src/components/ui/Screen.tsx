import { View, type ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  scroll?: boolean;
  noPadding?: boolean;
}

export function Screen({ children, style, safeArea = true, noPadding = false, ...props }: ScreenProps) {
  const Wrapper = safeArea ? SafeAreaView : View;
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: noPadding ? 0 : 16,
    },
  });

  return (
    <Wrapper style={styles.container} {...props}>
      <StatusBar style={colors.statusBar as any} />
      <View style={[styles.content, style]}>
        {children}
      </View>
    </Wrapper>
  );
}
