import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../components/SearchBar';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  // Stato finto per simulare un utente loggato o meno
  const [user, setUser] = useState(null); 

  return (
    <View style={styles.container}>
      
      {/* 1. MAPPA DI SFONDO (A tutto schermo) */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 41.9028, // Roma (Centro Italia)
          longitude: 12.4964,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
      />

      {/* 2. LIVELLO UI (Sopra la mappa) 
          pointerEvents="box-none" permette di cliccare sulla mappa dove non ci sono bottoni 
      */}
      <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
        
        {/* Header: Barra Ricerca + Bottone Utente */}
        <View style={styles.headerRow}>
          
          {/* Componente Barra di Ricerca Custom */}
          <View style={styles.searchWrapper}>
            <SearchBar />
          </View>

          {/* Bottone Profilo / Login */}
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Ionicons name="person" size={24} color="#1D2D44" />
          </TouchableOpacity>

        </View>

        {/* Qui puoi aggiungere altri bottoni flottanti in basso (es. "+" per segnalazioni) */}
        
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  uiContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Importante per allineare la searchbar che si espande
    zIndex: 10,
  },
  searchWrapper: {
    flex: 1,
    marginRight: 10,
  },
  profileButton: {
    width: 45,
    height: 45,
    backgroundColor: 'white',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Ombra Android
    shadowColor: '#000', // Ombra iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});