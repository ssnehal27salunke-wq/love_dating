import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api';
import { haptics } from '../../utils/haptics';

export default function PartnerPreferencesScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  // Simplified for MVP: just looking for gender and age range
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'any'>(user?.looking_for || 'any');
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    haptics.success();
    setIsLoading(true);

    try {
      await api.put('/profiles/me', {
        looking_for: lookingFor,
        partner_age_min: 18,
        partner_age_max: 60,
      });

      // Mark profile as "complete" so App.tsx routes us to Home
      updateUser({
        looking_for: lookingFor,
        profile_completeness: 100, // Trigger App.tsx to leave onboarding
      });
      // App.tsx RootNavigator reacts to user object updates.
    } catch (err) {
      console.error('Failed to complete setup', err);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Who are you looking for?</Text>
        <Text style={styles.subtitle}>We'll use this to find your perfect match.</Text>

        <View style={styles.optionsContainer}>
          {[
            { label: 'Men', value: 'male' },
            { label: 'Women', value: 'female' },
            { label: 'Everyone', value: 'any' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, lookingFor === opt.value && styles.optionCardActive]}
              onPress={() => { haptics.selection(); setLookingFor(opt.value as any); }}
            >
              <Text style={[styles.optionText, lookingFor === opt.value && styles.optionTextActive]}>
                {opt.label}
              </Text>
              {lookingFor === opt.value && (
                <View style={styles.checkmark} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={{ marginTop: 20 }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>Start Matching</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: '#fff',
  },
  optionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
