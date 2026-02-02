import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Geojson, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; 

import { getAllTickets } from '../services/ticketService';
import { searchTenantByCoordinates } from '../services/tenantService'; 
import { getAddressFromCoordinates, searchCity } from '../services/nominatim';
import SearchBar from '../component/SearchBar';

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  
  // Stato creazione: Solo marker e validazione zona
  const [newMarker, setNewMarker] = useState(null);
  const [address, setAddress] = useState('');
  
  // Stato visualizzazione ticket esistenti
  const [existingTickets, setExistingTickets] = useState([]);
  
  // Gestione Confini Dinamici
  const [currentBoundary, setCurrentBoundary] = useState(null);
  const [isValidZone, setIsValidZone] = useState(false);
  const [validatingZone, setValidatingZone] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve il permesso di posizione per usare la mappa');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });

      // NEW: Carica il boundary per la posizione attuale dell'utente all'avvio
      checkCurrentLocationBoundary(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchExistingTickets();
      // Nota: Non resettiamo currentBoundary qui per mantenerlo visibile mentre ci si muove
      setNewMarker(null);
    }, [])
  );

  const fetchExistingTickets = async () => {
      try {
          const tickets = await getAllTickets();
          
          // --- FIX CRASH QUI ---
          // Se tickets è null o undefined, usiamo un array vuoto [] per evitare l'errore su .filter
          const safeTickets = Array.isArray(tickets) ? tickets : [];
          const validTickets = safeTickets.filter(t => t.lat && t.lon);
          
          setExistingTickets(validTickets);
      } catch (e) {
          console.warn("Errore caricamento pin mappa:", e);
          setExistingTickets([]); // Reset in caso di errore
      }
  };

  // Funzione per mostrare i confini all'avvio senza piazzare pin
  const checkCurrentLocationBoundary = async (lat, lon) => {
    try {
        const result = await searchTenantByCoordinates(lat, lon);
        if (result && result.boundary) {
            setCurrentBoundary(result.boundary);
        }
    } catch (e) {
        console.log("Impossibile caricare boundary iniziale:", e);
    }
  };

  const validateZoneAndSetMarker = async (lat, lon) => {
    setValidatingZone(true);
    setNewMarker({ latitude: lat, longitude: lon });
    setAddress("Verifica zona in corso...");
    
    // Resettiamo il boundary per essere sicuri di mostrare quello del punto cliccato
    setCurrentBoundary(null); 
    setIsValidZone(false);

    try {
        const result = await searchTenantByCoordinates(lat, lon);

        if (result && result.boundary) {
            setIsValidZone(true);
            setCurrentBoundary(result.boundary); 
            const addr = await getAddressFromCoordinates(lat, lon);
            setAddress(addr || "Posizione valida");
        } else {
            setIsValidZone(false);
            setAddress("Zona non coperta dal servizio");
            Alert.alert("Attenzione", "Il punto selezionato non rientra in nessuno dei comuni gestiti.");
        }
    } catch (error) {
        console.error("Errore validazione zona:", error);
        setAddress("Impossibile verificare la zona");
    } finally {
        setValidatingZone(false);
    }
  };

  const handleLongPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    await validateZoneAndSetMarker(latitude, longitude);
  };

  const handleSearchLocation = async (query) => {
    const coords = await searchCity(query);
    if (coords) {
        const newRegion = {
            latitude: coords.lat,
            longitude: coords.lon,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        await validateZoneAndSetMarker(coords.lat, coords.lon);
    } else {
        Alert.alert("Non trovato", "Luogo non trovato.");
    }
  };

  // Funzione per quando clicchi sulla nuvoletta del marker
  const goToCreateTicketFromMarker = () => {
      if (!newMarker) return;
      navigation.navigate('CreateTicket', { 
          lat: newMarker.latitude, 
          lon: newMarker.longitude 
      });
  };

  // Funzione per il tasto + (GPS)
  const goToCreateTicketGeneric = () => {
      navigation.navigate('CreateTicket');
  };

  if (!region) return <View style={styles.loader}><ActivityIndicator size="large" color="#467599" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
         <SearchBar onSearch={handleSearchLocation} />
      </View>

      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={region} 
        onLongPress={handleLongPress}
        showsUserLocation={true}
        provider={Platform.OS === 'android' ? 'google' : undefined}
      >
        {currentBoundary && (
            <Geojson 
                geojson={currentBoundary} 
                strokeColor="#4CAF50" 
                fillColor="rgba(76, 175, 80, 0.2)" 
                strokeWidth={2}
            />
        )}

        {newMarker && (
            <Marker coordinate={newMarker} pinColor={isValidZone ? "#D32F2F" : "#888"}>
                <Callout onPress={isValidZone ? goToCreateTicketFromMarker : null}>
                    <View style={styles.calloutBubble}>
                        <Text style={styles.calloutTitle}>Nuova Segnalazione</Text>
                        <Text style={{fontSize:12, marginBottom:5}}>
                            {validatingZone ? "Verifica..." : (isValidZone ? "Zona Valida" : "Fuori Zona")}
                        </Text>
                        {isValidZone && !validatingZone && (
                            <View style={styles.createBtn}>
                                <Text style={styles.createBtnText}>CREA TICKET QUI</Text>
                                <Ionicons name="arrow-forward-circle" size={16} color="white" style={{marginLeft:5}}/>
                            </View>
                        )}
                    </View>
                </Callout>
            </Marker>
        )}

        {existingTickets.map((t, index) => {
            const isResolved = t.status === 'Risolto' || t.status === 'CHIUSO' || t.status === 'CLOSED';
            return (
                <Marker 
                    key={`ticket-${t.id}-${index}`}
                    coordinate={{ latitude: parseFloat(t.lat), longitude: parseFloat(t.lon) }}
                    pinColor={isResolved ? "green" : "orange"}
                    opacity={0.8}
                >
                    <Callout tooltip onPress={() => navigation.navigate('TicketDetail', { id: t.id })}>
                        <View style={styles.calloutBubble}>
                            <Text style={styles.calloutTitle}>{t.title || t.titolo}</Text>
                            <Text style={styles.calloutStatus}>{t.status || 'Aperto'}</Text>
                            <Text style={styles.calloutNote}>Clicca per dettagli</Text>
                        </View>
                    </Callout>
                </Marker>
            );
        })}

      </MapView>

      {/* Info Panel: visibile solo se non sto piazzando un marker */}
      {!newMarker && (
        <View style={styles.infoPanel}>
            <Text style={styles.infoText}>
                Tieni premuto sulla mappa per segnalare
            </Text>
        </View>
      )}

      {/* FAB: Tasto + per creare ticket rapidamente (usa GPS attuale) */}
      <TouchableOpacity style={styles.fab} onPress={goToCreateTicketGeneric}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute', top: 50, left: 10, right: 10, zIndex: 10,
  },
  infoPanel: {
      position: 'absolute', bottom: 30, alignSelf:'center',
      backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingVertical: 8, 
      borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, zIndex: 5
  },
  infoText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  calloutBubble: { 
      backgroundColor: 'white', borderRadius: 8, padding: 10, width: 160, alignItems: 'center',
      elevation: 5, shadowColor:'#000', shadowOpacity:0.2, marginBottom: 5 
  },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 2, color: '#1F2937' },
  calloutStatus: { fontSize: 12, color: '#666', marginBottom: 2 },
  calloutNote: { fontSize: 10, color: 'blue', fontStyle: 'italic' },
  createBtn: { 
      backgroundColor: '#D32F2F', flexDirection:'row', alignItems:'center', justifyContent:'center',
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginTop: 5, width: '100%' 
  },
  createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  
  // Stili per il bottone +
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D32F2F', 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10
  },
});