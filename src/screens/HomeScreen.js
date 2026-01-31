import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Alert } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, Geojson } from 'react-native-maps';
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';
import { searchCity } from '../services/nominatim';
import { getAllTickets } from '../services/ticketService'; 
import { searchTenantByCoordinates } from '../services/tenantService'; 

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); 
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef(null);
  
  const [tickets, setTickets] = useState([]); 
  const [currentBoundary, setCurrentBoundary] = useState(null); 
  const [region, setRegion] = useState({
      latitude: 41.8719, longitude: 12.5674,
      latitudeDelta: 6, longitudeDelta: 6,
  });

  // Carica i ticket pubblici per la mappa
  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [])
  );

  const fetchTickets = async () => {
    try {
        const allData = await getAllTickets();
        setTickets(allData);
    } catch (e) { console.error(e); }
  };

  // Posizione Iniziale
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const userRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion(userRegion, 1000);
          loadBoundaryForLocation(loc.coords.latitude, loc.coords.longitude);
        }
      } catch (e) { console.log("Uso posizione default"); }
    })();
  }, []);

  const handleSearch = async (text) => {
    const result = await searchCity(text);
    if (result && mapRef.current) {
        const newRegion = {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
        mapRef.current.animateToRegion(newRegion, 1000); 
        loadBoundaryForLocation(result.lat, result.lon);
    } else {
        Alert.alert("Non trovato", "Luogo non trovato.");
    }
  };

  const loadBoundaryForLocation = async (lat, lon) => {
      try {
          const result = await searchTenantByCoordinates(lat, lon);
          if (result && result.boundary) {
              setCurrentBoundary(result.boundary);
          } else {
              setCurrentBoundary(null);
          }
      } catch (e) { console.error("Errore boundary:", e); }
  };

  const handleZoom = (amount) => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom += amount;
      mapRef.current.animateCamera(cam);
    });
  };

  const getStatusColor = (status) => {
      const s = status ? status.toLowerCase() : '';
      if (s === 'risolto' || s === 'chiuso') return '#4CAF50'; 
      if (s === 'in corso' || s === 'assegnato') return 'orange';
      return '#D32F2F'; 
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* HEADER */}
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.navBarContent}>
            <View style={styles.searchContainer}>
               <SearchBar onSearch={handleSearch} />
            </View>

            {user && (
                <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                    <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity>
            )}

            <View style={styles.userContainer}>
                {user ? (
                    <TouchableOpacity style={styles.avatarBtn} onPress={() => setMenuVisible(!menuVisible)}>
                        <Text style={styles.avatarText}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.loginLinkBtn} onPress={() => navigation.navigate('AuthModal')}>
                        <Text style={styles.loginLinkText}>Accedi</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>

        {/* MENU DROPDOWN */}
        {menuVisible && user && (
            <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
                </View>
                <View style={styles.divider}/>
                
                {/* Link dinamici in base al ruolo per tornare alla dashboard principale */}
                {user.role === 'cittadino' && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('CitizenHome'); }}> 
                      <Ionicons name="home" size={20} color="#333" />
                      <Text style={styles.menuText}>Home Cittadino</Text>
                  </TouchableOpacity>
                )}
                {user.role === 'operatore' && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('OperatorHome'); }}> 
                      <Ionicons name="construct" size={20} color="#333" />
                      <Text style={styles.menuText}>Dashboard Operatore</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }}>
                    <Ionicons name="person" size={20} color="#333" />
                    <Text style={styles.menuText}>Profilo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { logout(); setMenuVisible(false); navigation.replace('Home'); }}>
                    <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
                    <Text style={[styles.menuText, {color: '#d32f2f'}]}>Logout</Text>
                </TouchableOpacity>
            </View>
        )}
      </SafeAreaView>

      {/* MAPPA */}
      <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            showsUserLocation={true}
            rotateEnabled={false}
          >
            {currentBoundary && (
                <Geojson geojson={currentBoundary} strokeColor="#467599" fillColor="rgba(70, 117, 153, 0.15)" strokeWidth={2} />
            )}
            
            {tickets.map(t => {
                const lat = parseFloat(t.lat || t.latitude);
                const lon = parseFloat(t.lon || t.longitude);
                if (!lat || !lon) return null;
                return (
                  <Marker 
                    key={t.id} coordinate={{ latitude: lat, longitude: lon }}
                    onCalloutPress={() => navigation.navigate('TicketDetail', { ticket: t })}
                  >
                    <View style={[styles.markerCircle, {backgroundColor: getStatusColor(t.status)}]}>
                      <Ionicons name="alert" size={16} color="white" />
                    </View>
                  </Marker>
                );
            })}
          </MapView>

          <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(1)}><Ionicons name="add" size={24} color="#333" /></TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-1)}><Ionicons name="remove" size={24} color="#333" /></TouchableOpacity>
          </View>
          
          {/* Per utenti non loggati o cittadini, mostriamo il FAB per segnalare rapidamente */}
          {(!user || user.role === 'cittadino') && (
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate(user ? 'CreateTicket' : 'AuthModal')}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  headerContainer: { backgroundColor: '#1F2937', zIndex: 10, elevation: 5 },
  navBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  searchContainer: { flex: 1, marginRight: 15 },
  userContainer: { justifyContent: 'center' }, 
  notifBtn: { marginRight: 15, padding: 5 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' },
  avatarText: { color: 'white', fontWeight: 'bold' },
  loginLinkBtn: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  loginLinkText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  dropdownMenu: { position: 'absolute', top: 60, right: 10, backgroundColor: 'white', borderRadius: 8, elevation: 10, minWidth: 180, zIndex: 20 },
  dropdownHeader: { padding: 12, backgroundColor: '#F3F4F6', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  userName: { fontWeight: 'bold', color: '#1F2937' },
  userRole: { fontSize: 10, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, color: '#333' },
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },
  markerCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', elevation: 3 },
  zoomControls: { position: 'absolute', right: 15, top: 20, backgroundColor: 'white', borderRadius: 8, elevation: 5 },
  zoomBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#eee', width: '80%', alignSelf: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center', elevation: 8 },
});