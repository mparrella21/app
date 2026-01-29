import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Importazione schermate
import HomeScreen from './src/screens/HomeScreen';
import AuthModal from './src/screens/AuthModal';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            // Queste opzioni servono per le trasparenze su Android/iOS
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
          }}
        >
          {/* La Home (Mappa) è la base */}
          <Stack.Screen name="Home" component={HomeScreen} />

          {/* Il Login è un POPUP sopra la mappa (Transparent Modal) */}
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
    </SafeAreaProvider>
  );
}