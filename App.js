import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// --- SCREENS IMPORT ---
import HomeScreen from './src/screens/HomeScreen'; // Mappa pubblica
import AuthModal from './src/screens/AuthModal';

// Schermate Cittadino
import CitizenHomeScreen from './src/screens/CitizenHomeScreen'; // Dashboard Dashboard
import CreateTicketScreen from './src/screens/CreateTicketScreen';
import UserTicketsScreen from './src/screens/UserTicketsScreen'; 

// Schermate Operatore
import OperatorTicketsScreen from './src/screens/OperatorTicketsScreen'; // Dashboard Operativa

// Schermate Responsabile
import ResponsibleTicketsScreen from './src/screens/ResponsibleTicketsScreen'; // Dashboard Gestionale
import ManageOperatorsScreen from './src/screens/ManageOperatorsScreen';

// Schermate Comuni
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  // FIX SICUREZZA: Convertiamo in Stringa prima di fare toLowerCase()
  // Questo previene crash se user.role è un numero (es. 1) o undefined
  const getRole = () => {
      if (!user || !user.role) return '';
      return String(user.role).toLowerCase();
  };

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
          // --- NON LOGGATO ---
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
          // --- LOGGATO ---
          <>
            {/* 1. Routing Principale in base al Ruolo */}
            {getRole() === 'responsabile' || getRole() === 'admin' ? (
              <>
                <Stack.Screen name="ResponsibleHome" component={ResponsibleTicketsScreen} />
                <Stack.Screen name="ManageOperators" component={ManageOperatorsScreen} />
              </>
            ) : getRole() === 'operatore' ? (
              // Operatore va diretto ai lavori
              <Stack.Screen name="OperatorHome" component={OperatorTicketsScreen} />
            ) : (
              // Cittadino (o default/fallback) va alla dashboard personale
              <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} />
            )}

            {/* 2. Schermate di Supporto (Accessibili da tutti i ruoli) */}
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
            
            {/* 3. Schermate specifiche richiamate dai flussi */}
            <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="UserTickets" component={UserTicketsScreen} options={{ presentation: 'card' }} />
            
            {/* La mappa è accessibile anche da loggati (es. dal FAB del cittadino) */}
            <Stack.Screen name="Map" component={HomeScreen} /> 
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}