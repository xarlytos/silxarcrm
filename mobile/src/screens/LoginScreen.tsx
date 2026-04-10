import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '../lib/api';
import { colors, borderRadius, shadows } from '../lib/theme';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email y contrasena requeridos');
      return;
    }

    setLoading(true);
    try {
      const res = await mobileApi.login(email, password);
      await AsyncStorage.setItem('crm_token', res.data.accessToken);
      await AsyncStorage.setItem('crm_refresh', res.data.refreshToken);
      onLogin();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>📊</Text>
          </View>
          <Text style={styles.title}>CRM Maestro</Text>
          <Text style={styles.subtitle}>Panel de Control SaaS</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesion</Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@crm-maestro.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.warm.silver}
          />

          <Text style={styles.label}>CONTRASENA</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor={colors.warm.silver}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>CRM Maestro v1.0 - Panel Interno</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.card,
    backgroundColor: colors.matcha[800],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.clay,
  },
  logoEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: -1.32,
  },
  subtitle: {
    fontSize: 16,
    color: colors.warm.silver,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.oat.DEFAULT,
    padding: 24,
    ...shadows.clay,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.08,
    color: colors.warm.silver,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#717989',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.warm.silver,
    marginTop: 24,
  },
});
