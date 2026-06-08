import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api';
import { haptics } from '../../utils/haptics';

export default function ReligionLifestyleScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const [religion, setReligion] = useState(user?.profile?.religion || '');
  const [diet, setDiet] = useState(user?.profile?.diet || '');
  const [drinking, setDrinking] = useState(user?.profile?.drinking || '');
  const [smoking, setSmoking] = useState(user?.profile?.smoking || '');
  const [isLoading, setIsLoading] = useState(false);

  const RELIGION_OPTIONS = [
    { label: 'Hindu', value: 'hindu' },
    { label: 'Muslim', value: 'muslim' },
    { label: 'Christian', value: 'christian' },
    { label: 'Sikh', value: 'sikh' },
    { label: 'Jain', value: 'jain' },
    { label: 'Buddhist', value: 'buddhist' },
    { label: 'Other', value: 'other' },
    { label: 'No Religion', value: 'no_religion' },
  ];

  const DIET_OPTIONS = [
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Non-Vegetarian', value: 'non_vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Eggetarian', value: 'eggetarian' },
  ];

  const HABIT_OPTIONS = [
    { label: 'Never', value: 'never' },
    { label: 'Occasionally', value: 'occasionally' },
    { label: 'Regularly', value: 'regularly' },
  ];

  const isValid = religion && diet && drinking && smoking;

  const handleNext = async () => {
    if (!isValid) return;
    haptics.medium();
    setIsLoading(true);

    try {
      await api.put('/profiles/me', {
        religion,
        diet,
        drinking,
        smoking,
      });

      updateUser({
        profile: {
          ...user?.profile,
          religion,
          diet,
          drinking,
          smoking,
        }
      });

      navigation.navigate('PartnerPreferences');
    } catch (err) {
      console.error('Failed to update religion/lifestyle', err);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Lifestyle choices</Text>
        <Text style={styles.subtitle}>These help us find highly compatible matches.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Religion</Text>
          <View style={styles.chipContainer}>
            {RELIGION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, religion === opt.value && styles.chipActive]}
                onPress={() => { haptics.selection(); setReligion(opt.value); }}
              >
                <Text style={[styles.chipText, religion === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Diet</Text>
          <View style={styles.chipContainer}>
            {DIET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, diet === opt.value && styles.chipActive]}
                onPress={() => { haptics.selection(); setDiet(opt.value); }}
              >
                <Text style={[styles.chipText, diet === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, paddingRight: 8 }]}>
            <Text style={styles.label}>Drinking</Text>
            {HABIT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.listButton, drinking === opt.value && styles.listButtonActive]}
                onPress={() => { haptics.selection(); setDrinking(opt.value); }}
              >
                <Text style={[styles.listButtonText, drinking === opt.value && styles.listButtonTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.inputGroup, { flex: 1, paddingLeft: 8 }]}>
            <Text style={styles.label}>Smoking</Text>
            {HABIT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.listButton, smoking === opt.value && styles.listButtonActive]}
                onPress={() => { haptics.selection(); setSmoking(opt.value); }}
              >
                <Text style={[styles.listButtonText, smoking === opt.value && styles.listButtonTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]} 
          onPress={handleNext}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    opacity: 0.8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
  },
  listButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listButtonActive: {
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  listButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  listButtonTextActive: {
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#000',
  },
  nextButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#333',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
