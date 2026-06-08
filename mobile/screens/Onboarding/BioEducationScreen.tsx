import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api';
import { haptics } from '../../utils/haptics';

export default function BioEducationScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [educationLevel, setEducationLevel] = useState(user?.profile?.education_level || '');
  const [profession, setProfession] = useState(user?.profile?.profession || '');
  const [isLoading, setIsLoading] = useState(false);

  const EDUCATION_OPTIONS = [
    { label: 'High School', value: 'high_school' },
    { label: 'Diploma', value: 'diploma' },
    { label: 'Bachelors', value: 'bachelors' },
    { label: 'Masters', value: 'masters' },
    { label: 'PhD', value: 'phd' },
  ];

  const PROFESSION_OPTIONS = [
    { label: 'Software Engineer', value: 'software_engineer' },
    { label: 'Doctor', value: 'doctor' },
    { label: 'Business', value: 'business' },
    { label: 'Finance', value: 'finance' },
    { label: 'Artist', value: 'artist' },
    { label: 'Other', value: 'other' },
  ];

  const isValid = bio.length >= 10 && educationLevel && profession;

  const handleNext = async () => {
    if (!isValid) return;
    haptics.medium();
    setIsLoading(true);

    try {
      await api.put('/profiles/me', {
        bio: bio.trim(),
        education_level: educationLevel,
        profession: profession,
      });

      // Update local context profile
      updateUser({
        profile: {
          ...user?.profile,
          bio: bio.trim(),
          education_level: educationLevel,
          profession: profession,
        }
      });

      navigation.navigate('ReligionLifestyle');
    } catch (err) {
      console.error('Failed to update bio/education', err);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your background</Text>
          <Text style={styles.subtitle}>Tell potential matches a bit about yourself.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio (min 10 chars)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="I love hiking, reading, and exploring new coffee shops..."
              placeholderTextColor="#666"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Highest Education</Text>
            <View style={styles.chipContainer}>
              {EDUCATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, educationLevel === opt.value && styles.chipActive]}
                  onPress={() => { haptics.selection(); setEducationLevel(opt.value); }}
                >
                  <Text style={[styles.chipText, educationLevel === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profession</Text>
            <View style={styles.chipContainer}>
              {PROFESSION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, profession === opt.value && styles.chipActive]}
                  onPress={() => { haptics.selection(); setProfession(opt.value); }}
                >
                  <Text style={[styles.chipText, profession === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={{ height: 40 }} />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
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
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
  footer: {
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
