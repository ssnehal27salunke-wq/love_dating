import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';

export default function EmailScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API call to our Node.js backend
      await api.post('/auth/send-otp', { email });
      
      navigation.navigate('Otp', { email });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Try again.');
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
          <Text style={styles.title}>What's your email?</Text>
          <Text style={styles.subtitle}>We'll send you a magic code. No passwords to remember.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, !email && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!email || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
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
    backgroundColor: '#1C1C1E', // Apple system gray 6 dark
    color: '#FFFFFF',
    fontSize: 18,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  errorText: { color: '#FF453A', marginTop: 12, fontSize: 14 },
  footer: { paddingBottom: 16 },
  button: { backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: '600' },
});
