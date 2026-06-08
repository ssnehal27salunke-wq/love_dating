import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { api } from '../../api';
import SwipeCard from '../../components/SwipeCard';

export default function DiscoverScreen() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDiscover();
  }, []);

  const fetchDiscover = async () => {
    try {
      // Fetch matches from API
      const { data } = await api.get('/matches/discover');
      // For mock mode, inject some fake data if empty so you can play with it
      if (data.data.length === 0) {
        setCandidates([
          { user: { id: '1', first_name: 'Emma', date_of_birth: '1995-05-12', profession: 'software_engineer', profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' } },
          { user: { id: '2', first_name: 'Sophia', date_of_birth: '1998-08-22', profession: 'artist', profile_photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80' } },
          { user: { id: '3', first_name: 'Olivia', date_of_birth: '1996-02-15', profession: 'doctor', profile_photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80' } },
        ]);
      } else {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch discover feed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = async (profile: any, action: 'like' | 'pass') => {
    // Remove top card
    setCandidates((prev) => prev.slice(1));
    
    // Send action to API
    try {
      await api.post('/matches/interest', {
        receiver_id: profile.id,
        type: action,
      });
    } catch (err) {
      console.error(`Failed to record ${action}`, err);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Discover</Text>
        
        <View style={styles.content}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : candidates.length > 0 ? (
            // Render stack of cards (bottom to top, so reverse order)
            candidates.slice(0, 3).reverse().map((candidate, index) => (
              <SwipeCard
                key={candidate.user.id}
                profile={candidate.user}
                onSwipeLeft={() => handleSwipe(candidate.user, 'pass')}
                onSwipeRight={() => handleSwipe(candidate.user, 'like')}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No more profiles</Text>
              <Text style={styles.emptyText}>Check back later for new matches!</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
