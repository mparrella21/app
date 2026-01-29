import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext'; // Importante!

import HomeScreen from './src/screens/HomeScreen';
import AuthModal from './src/screens/AuthModal';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Home" // <--- FIX: Parte sempre dalla Home
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' },
              cardOverlayEnabled: true,
              cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            
            <Stack.Screen 
              name="AuthModal" 
              component={AuthModal} 
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}