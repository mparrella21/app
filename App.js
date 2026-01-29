import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CitizenHomeScreen from './src/screens/CitizenHomeScreen';
import MapScreen from './src/screens/MapScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import AreaPersonaleMain from './src/screens/AreaPersonaleMain';
import ProfileScreen from './src/screens/ProfileScreen';
import CitizenTicketsScreen from './src/screens/CitizenTicketsScreen';
import OperatorTicketsScreen from './src/screens/OperatorTicketsScreen';
import ResponsibleTicketsScreen from './src/screens/ResponsibleTicketsScreen';
import { AuthProvider } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Benvenuto' }} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} options={{ title: 'Home Cittadino' }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Nuova Segnalazione' }} />
          <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Dettaglio Ticket' }} />
          <Stack.Screen name="AreaPersonale" component={AreaPersonaleMain} options={{ title: 'Area Personale' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profilo' }} />
          <Stack.Screen name="CitizenTickets" component={CitizenTicketsScreen} options={{ title: 'Le mie segnalazioni' }} />
          <Stack.Screen name="OperatorTickets" component={OperatorTicketsScreen} options={{ title: 'Gestione Ticket' }} />
          <Stack.Screen name="ResponsibleTickets" component={ResponsibleTicketsScreen} options={{ title: 'Gestione Responsabili' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}