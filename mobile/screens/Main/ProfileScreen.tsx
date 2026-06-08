import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      
      <View style={styles.content}>
        <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>
          {user?.first_name} {user?.last_name}
        </Text>

        <TouchableOpacity style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Log Out</Text>
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
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  buttonText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '600',
  },
});
