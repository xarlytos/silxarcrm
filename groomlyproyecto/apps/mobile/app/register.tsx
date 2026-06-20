import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { colors } = useTheme();
  const { register, registerState } = useAuth();

  const handleRegister = async () => {
    setError('');
    if (!email || !password || !firstName || !lastName) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        acceptTerms: true,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la cuenta');
    }
  };

  const isLoading = registerState.isPending;

  return (
    <Screen safeArea={false} style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollPadding}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.primary }]}>peluguau</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Crea tu cuenta gratuita</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={firstName}
              onChangeText={setFirstName}
              icon={<User size={20} color={colors.textMuted} />}
            />

            <Input
              label="Apellidos"
              placeholder="Tus apellidos"
              value={lastName}
              onChangeText={setLastName}
              icon={<User size={20} color={colors.textMuted} />}
            />

            <Input
              label="Email"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color={colors.textMuted} />}
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              icon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              }
            />
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <Button
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.buttonMargin}
            size="lg"
          >
            Crear cuenta
          </Button>

          <View style={styles.footer}>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  ¿Ya tienes cuenta? Inicia sesión
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollPadding: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  buttonMargin: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerLink: {
    fontWeight: '500',
    fontSize: 15,
  },
});
