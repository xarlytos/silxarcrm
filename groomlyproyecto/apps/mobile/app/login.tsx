import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Image, ImageBackground } from 'react-native';
import { Link } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { colors } = useTheme();
  const { login, loginState } = useAuth();
  const { isAvailable, isEnabled, savedEmail, authenticate, enableBiometric, getStoredToken } =
    useBiometricAuth();

  useEffect(() => {
    if (savedEmail && isEnabled) {
      setEmail(savedEmail);
      attemptBiometricAutoLogin();
    }
  }, [savedEmail, isEnabled]);

  const attemptBiometricAutoLogin = async () => {
    const token = await getStoredToken();
    if (token) {
      setEmail(savedEmail || '');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Email y contraseña son obligatorios');
      return;
    }
    try {
      const result = await login({ email, password });
      if (isAvailable && !isEnabled) {
        await enableBiometric(email, (result as any)?.token);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error al iniciar sesión');
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    if (!savedEmail) {
      setError('Primero inicia sesión con tu contraseña');
      return;
    }
    const success = await authenticate();
    if (success && savedEmail) {
      setEmail(savedEmail);
      setError('Introduce tu contraseña para continuar');
    }
  };

  const isLoading = loginState.isPending;

  return (
    <Screen safeArea={false}>
      <ImageBackground
        source={require('../assets/images/bg-dark.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={[styles.logoContainer, { marginBottom: 60 }]}>
              <Image
                source={require('../assets/images/logo-peluguau.png')}
                style={{ width: 280, height: 100, resizeMode: 'contain' }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}>
                Tu peluquería, en tu bolsillo
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
            <Input
              label="Email"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color={colors.textMuted} />}
            />

            <View style={{ height: 16 }} />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              icon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              }
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          {/* Button */}
          <GradientButton
            onPress={handleLogin}
            isLoading={isLoading}
            size="lg"
            style={{ marginTop: 24 }}
          >
            Iniciar sesión
          </GradientButton>

          {/* Biometría */}
          {isAvailable && isEnabled && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              style={styles.biometricContainer}
              activeOpacity={0.8}
            >
              <View style={[styles.biometricIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Fingerprint size={24} color={colors.primary} />
              </View>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                Entrar con huella / Face ID
              </Text>
            </TouchableOpacity>
          )}

          {/* Register link */}
          <View style={styles.registerContainer}>
            <Link href="/register" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                  ¿No tienes cuenta? Crear una
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            peluguau.com · La herramienta que tu peluquería necesita
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  formContainer: {
    marginBottom: 8,
  },
  errorText: {
    color: '#FF4D6D',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  biometricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  biometricIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  registerContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#5A616D',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
  },
});
