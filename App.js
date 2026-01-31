import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// --- SCREENS IMPORT ---
// Schermate Pubbliche
import HomeScreen from './src/screens/HomeScreen';
import AuthModal from './src/screens/AuthModal';

// Schermate Cittadino
import CitizenHomeScreen from './src/screens/CitizenHomeScreen';
import CreateTicketScreen from './src/screens/CreateTicketScreen';
import UserTicketsScreen from './src/screens/UserTicketsScreen';

// Schermate Operatore
import OperatorTicketsScreen from './src/screens/OperatorTicketsScreen';

// Schermate Responsabile
import ResponsibleTicketsScreen from './src/screens/ResponsibleTicketsScreen';
import ManageOperatorsScreen from './src/screens/ManageOperatorsScreen';

// Schermate Comuni (accessibili dopo login)
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createStackNavigator();

/**
 * Componente per gestire la logica di navigazione
 * separato per poter usare l'hook useAuth()
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  // 1. Schermata di Caricamento (mentre controlla il token salvato)
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#1D2D44" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#1F2937" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      >
        {user == null ? (
          // ************************************************************
          // GRUPPO 1: UTENTE NON LOGGATO (PUBLIC)
          // ************************************************************
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="AuthModal" 
              component={AuthModal} 
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
              }}
            />
          </>
        ) : (
          // ************************************************************
          // GRUPPO 2: UTENTE LOGGATO (PROTECTED)
          // ************************************************************
          <>
            {/* A. SCELTA DELLA HOME IN BASE AL RUOLO */}
            {user.role === 'Responsabile' ? (
              // Stack Responsabile
              <>
                <Stack.Screen name="ResponsibleHome" component={ResponsibleTicketsScreen} />
                <Stack.Screen name="ManageOperators" component={ManageOperatorsScreen} />
              </>
            ) : user.role === 'Operatore' ? (
              // Stack Operatore
              <Stack.Screen name="OperatorHome" component={OperatorTicketsScreen} />
            ) : (
              // Stack Cittadino (Default)
              <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} />
            )}

            {/* B. SCHERMATE COMUNI (Accessibili a tutti i ruoli loggati) */}
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
            
            {/* Schermate specifiche per Cittadino ma definite qui per accesso globale se serve */}
            <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="UserTickets" component={UserTicketsScreen} options={{ presentation: 'card' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Componente Principale
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}