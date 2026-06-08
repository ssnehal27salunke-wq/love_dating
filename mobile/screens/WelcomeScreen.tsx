import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send to backend
      const response = await api.post('/auth/oauth/apple', {
        apple_id: credential.user,
        email: credential.email,
        first_name: credential.fullName?.givenName,
        last_name: credential.fullName?.familyName,
        identity_token: credential.identityToken,
      });

      const { token, user } = response.data;
      await login(token, user);
      
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User canceled
      } else {
        Alert.alert('Login Failed', e.response?.data?.error || e.message || 'Could not connect to server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert('Coming Soon', 'Google Sign-In requires a Google Cloud project setup.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LoveMarriage</Text>
        <Text style={styles.subtitle}>Find your person. No friction.</Text>
      </View>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 20 }} />
        ) : (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={30}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
  },
  footer: {
    gap: 16,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  googleButton: {
    backgroundColor: '#1C1C1E', // Dark gray for Google button to contrast with Apple's white
    width: '100%',
    height: 56,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
