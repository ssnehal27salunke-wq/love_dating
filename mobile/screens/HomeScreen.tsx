import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DiscoverScreen from './Main/DiscoverScreen';
import MatchesScreen from './Main/MatchesScreen';
import ProfileScreen from './Main/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1C1C1E',
          height: 85,
          paddingBottom: 30,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="DiscoverTab" 
        component={DiscoverScreen} 
        options={{ title: 'Discover' }} 
      />
      <Tab.Screen 
        name="MatchesTab" 
        component={MatchesScreen} 
        options={{ title: 'Matches' }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }} 
      />
    </Tab.Navigator>
  );
}
