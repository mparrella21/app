import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext'; 

// IMPORTAZIONE SCHERMATE (Corrispondenti ai file creati)
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
          {/* Status Bar scura per matchare l'header dell'app */}
          <StatusBar style="light" backgroundColor="#1F2937" />
          
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              // Fondamentale per la trasparenza della modale di login
              cardStyle: { backgroundColor: 'transparent' }, 
            }}
          >
            
            {/* 1. HOME (Mappa + Dashboards + Logic) */}
            <Stack.Screen name="Home" component={HomeScreen} />
            
            {/* 2. AUTH MODAL (Popup Trasparente) */}
            <Stack.Screen 
              name="AuthModal" 
              component={AuthModal} 
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
              }}
            />

            {/* 3. CREA TICKET (Slide dal basso) */}
            <Stack.Screen 
              name="CreateTicket" 
              component={CreateTicketScreen} 
              options={{
                presentation: 'modal', 
              }}
            />

            {/* 4. DETTAGLIO TICKET (Slide laterale classico) */}
            <Stack.Screen 
              name="TicketDetail" 
              component={TicketDetailScreen} 
              options={{
                presentation: 'card',
              }}
            />

          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}