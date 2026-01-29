import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext'; 

import HomeScreen from './src/screens/HomeScreen';
import AuthModal from './src/screens/AuthModal';
import CreateTicketScreen from './src/screens/CreateTicketScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#1F2937" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' },
            }}
          >
            {/* HOME PAGE */}
            <Stack.Screen name="Home" component={HomeScreen} />
            
            {/* MODALE LOGIN (Trasparente su mappa) */}
            <Stack.Screen 
              name="AuthModal" 
              component={AuthModal} 
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
              }}
            />

            {/* CREAZIONE TICKET (Slide up) */}
            <Stack.Screen 
              name="CreateTicket" 
              component={CreateTicketScreen} 
              options={{
                presentation: 'modal', 
                headerShown: false
              }}
            />

            {/* DETTAGLIO TICKET (Card slide) */}
            <Stack.Screen 
              name="TicketDetail" 
              component={TicketDetailScreen} 
              options={{
                presentation: 'card',
                headerShown: false
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}