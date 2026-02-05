import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// --- SCREENS IMPORT ---
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

// Schermate Comuni
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

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

  // LOGICA DI REINDIRIZZAMENTO INIZIALE
  // Se Operatore -> OperatorHome
  // Se Responsabile/Admin -> ResponsibleHome
  // Altrimenti (Cittadino o non loggato) -> Home (Mappa)
  const initialRouteName = "Home";

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#1F2937" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
        initialRouteName={initialRouteName}
      >
        
        {/* MAPPA (Home Base) */}
        <Stack.Screen name="Home" component={HomeScreen} />

        {/* AUTH */}
        {!user && (
            <Stack.Screen 
              name="AuthModal" 
              component={AuthModal} 
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
              }}
            />
        )}

        {/* LOGGATO */}
        {user && (
          <>
            <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} />
            <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="UserTickets" component={UserTicketsScreen} />

            <Stack.Screen name="OperatorHome" component={OperatorTicketsScreen} />
            <Stack.Screen name="ResponsibleHome" component={ResponsibleTicketsScreen} />
            <Stack.Screen name="ManageOperators" component={ManageOperatorsScreen} />

            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
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