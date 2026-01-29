import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';

// Import Schermate
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import UserDashboardScreen from './src/screens/UserDashboardScreen'; // La dashboard che abbiamo creato
import CreateTicketScreen from './src/screens/CreateTicketScreen'; // Il file che avevi già

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            
            {/* Home Page Base */}
            <Stack.Screen name="Home" component={HomeScreen} />
            
            {/* Schermate Interne */}
            <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
            <Stack.Screen name="CreateTicket" component={CreateTicketScreen} />

            {/* MODALE DI LOGIN (Rinominata 'AuthModal' per farla funzionare con il tuo codice) */}
            <Stack.Screen 
              name="AuthModal"  // <--- IMPORTANTE: Si chiama AuthModal ora!
              component={LoginScreen} 
              options={{
                presentation: 'transparentModal', // Sfondo trasparente
                cardStyle: { backgroundColor: 'transparent' }, // Rimuove il bianco
                animationEnabled: true,
              }}
            />
            
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}