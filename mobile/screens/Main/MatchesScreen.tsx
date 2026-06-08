import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Matches</Text>
      <View style={styles.content}>
        <Text style={{ color: '#fff' }}>Chat list placeholder (to be built)</Text>
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
});
