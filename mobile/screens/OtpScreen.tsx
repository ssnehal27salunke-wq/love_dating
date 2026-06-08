import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';

export default function OtpScreen({ route, navigation }: any) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      
      // In a real app, store response.data.token securely using expo-secure-store here
      
      navigation.navigate('Home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (text.length === 6) {
                // Auto-verify when 6 digits are typed could be added here
                setError('');
              }
            }}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={otp.length !== 6 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  keyboardView: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  header: { height: 60, justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 32, lineHeight: 22 },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    fontSize: 32,
    letterSpacing: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: { color: '#FF453A', marginTop: 12, fontSize: 14, textAlign: 'center' },
  footer: { paddingBottom: 16 },
  button: { backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: '600' },
});
