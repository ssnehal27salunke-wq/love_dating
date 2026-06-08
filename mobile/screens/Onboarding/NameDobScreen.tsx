import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api';
import { haptics } from '../../utils/haptics';

export default function NameDobScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  // Simplified DOB for MVP: YYYY-MM-DD
  const [dob, setDob] = useState(user?.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(user?.gender || '');
  const [isLoading, setIsLoading] = useState(false);

  const isValid = firstName.trim().length >= 2 && dob.length === 10 && gender !== '';

  const handleNext = async () => {
    if (!isValid) return;
    haptics.medium();
    setIsLoading(true);

    try {
      // Update profile with core details
      await api.put('/profiles/me', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob,
        gender: gender,
      });

      // Update local auth context so navigation reroutes
      updateUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob,
        gender: gender,
      });
      
      // Navigate to PhotoUpload next
      navigation.navigate('PhotoUpload');
    } catch (err) {
      console.error('Failed to update name/dob', err);
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
        <View style={styles.content}>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.subtitle}>This information will be shown on your profile.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John"
              placeholderTextColor="#666"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Doe"
              placeholderTextColor="#666"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="1995-08-25"
              placeholderTextColor="#666"
              value={dob}
              onChangeText={setDob}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                  onPress={() => { haptics.selection(); setGender(g as any); }}
                >
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

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
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  genderText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
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
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#333',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
