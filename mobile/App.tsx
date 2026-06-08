import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './hooks/useAuth';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import EmailScreen from './screens/EmailScreen';
import OtpScreen from './screens/OtpScreen';
import HomeScreen from './screens/HomeScreen';
import PhotoUploadScreen from './screens/Onboarding/PhotoUploadScreen';
import BioEducationScreen from './screens/Onboarding/BioEducationScreen';
import ReligionLifestyleScreen from './screens/Onboarding/ReligionLifestyleScreen';
import PartnerPreferencesScreen from './screens/Onboarding/PartnerPreferencesScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const isProfileIncomplete = user && (!user.first_name || !user.date_of_birth);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' }, // Apple Dark Mode depth
        animation: 'slide_from_right',
      }}
    >
      {!token ? (
        // Auth Stack
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Email" component={EmailScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : isProfileIncomplete ? (
        // Onboarding Stack
        <>
          <Stack.Screen name="NameDob" component={NameDobScreen} />
          <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
          <Stack.Screen name="BioEducation" component={BioEducationScreen} />
          <Stack.Screen name="ReligionLifestyle" component={ReligionLifestyleScreen} />
          <Stack.Screen name="PartnerPreferences" component={PartnerPreferencesScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
