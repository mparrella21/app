import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, Geojson } from 'react-native-maps';
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';
import { searchCity } from '../services/nominatim';

// IMPORTA GEOJSON ITALIA (File Semplificato)
import ItalyBoundary from '../assets/data/limits_IT_simplified.json'; 

const { width, height } = Dimensions.get('window');

// DATI MOCK 
const MOCK_TICKETS = [
  { id: 1, title: 'Buca pericolosa', category: 'Strade', description: 'Via Roma dissestata', lat: 40.682, lon: 14.768, status: 'Aperto', author: 'Giuseppe B.', date: '29/01/2026' }, 
  { id: 2, title: 'Lampione rotto', category: 'Illuminazione', description: 'Buio totale', lat: 41.9028, lon: 12.4964, status: 'In Corso', author: 'Anna N.', date: '28/01/2026' }, 
  { id: 3, title: 'Rifiuti abbandonati', category: 'Ambiente', description: 'Sacchetti in strada', lat: 45.4642, lon: 9.1900, status: 'Risolto', author: 'Luca S.', date: '27/01/2026' }, 
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); 
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef(null);
  
  // Stato iniziale centrato sull'Italia
  const [region, setRegion] = useState({
      latitude: 41.8719,
      longitude: 12.5674,
      latitudeDelta: 6, 
      longitudeDelta: 6,
  });

  // AL CARICAMENTO: CERCA LA POSIZIONE DELL'UTENTE
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
        }
      } catch (e) {
        console.log("Impossibile recuperare posizione, uso default Italia");
      }
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
    } else {
        Alert.alert("Non trovato", "Luogo non trovato. Prova con una città o indirizzo.");
    }
  };

  const handleZoom = (amount) => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom += amount;
      mapRef.current.animateCamera(cam);
    });
  };

  // --- DASHBOARD MANAGER ---
  const renderManagerPanel = () => (
    <View style={styles.rolePanel}>
        <Text style={styles.panelTitle}>Dashboard Gestione</Text>
        <View style={styles.statGrid}>
            <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: '#D32F2F'}]}>{MOCK_TICKETS.filter(t => t.status === 'Aperto').length}</Text>
                <Text style={styles.statLabel}>Aperti</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: 'orange'}]}>{MOCK_TICKETS.filter(t => t.status === 'In Corso').length}</Text>
                <Text style={styles.statLabel}>In Corso</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: '#467599'}]}>{MOCK_TICKETS.filter(t => t.status === 'Risolto').length}</Text>
                <Text style={styles.statLabel}>Risolti</Text>
            </View>
        </View>
        <Text style={styles.subHeader}>Lista Segnalazioni (Demo)</Text>
        <ScrollView style={{height: 120}}>
            {MOCK_TICKETS.map(t => (
                <TouchableOpacity key={t.id} style={styles.listItem} onPress={() => navigation.navigate('TicketDetail', {ticket: t})}>
                    <View>
                        <Text style={{fontWeight:'bold', color: '#1F2937'}}>{t.title}</Text>
                        <Text style={{fontSize:11, color:'#666'}}>{t.category} - {t.author}</Text>
                    </View>
                    <Text style={{fontSize:10, color:'orange', fontWeight:'bold'}}>{t.status.toUpperCase()}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    </View>
  );

  // --- DASHBOARD OPERATORE ---
  const renderOperatorPanel = () => (
    <View style={styles.rolePanel}>
        <Text style={styles.panelTitle}>I Miei Incarichi</Text>
        <ScrollView>
            {MOCK_TICKETS.map(t => (
                <TouchableOpacity key={t.id} style={styles.taskItem} onPress={() => navigation.navigate('TicketDetail', {ticket: t})}>
                    <Ionicons name="construct" size={24} color="#467599" />
                    <View style={{marginLeft: 10, flex: 1}}>
                        <Text style={{fontWeight:'bold', color: '#1F2937'}}>{t.title}</Text>
                        <Text style={{fontSize:12, color:'#666'}}>Assegnato: {t.date}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
            ))}
        </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* HEADER */}
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.navBarContent}>
            <View style={styles.searchContainer}>
               <SearchBar onSearch={handleSearch} />
            </View>

            {/* --- CAMPANELLA NOTIFICHE (Visibile solo se loggato) --- */}
            {user && (
                <TouchableOpacity 
                    style={styles.notifBtn} 
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Ionicons name="notifications-outline" size={24} color="white" />
                    <View style={styles.badgeDot} />
                </TouchableOpacity>
            )}

            <View style={styles.userContainer}>
                {user ? (
                    <TouchableOpacity style={styles.avatarBtn} onPress={() => setMenuVisible(!menuVisible)}>
                        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.loginLinkBtn} onPress={() => navigation.navigate('AuthModal')}>
                        <Text style={styles.loginLinkText}>Accedi</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>

        {/* MENU A TENDINA */}
        {menuVisible && user && (
            <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
                </View>
                <View style={styles.divider}/>
                
                <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => { 
                        setMenuVisible(false);
                        navigation.navigate('Profile'); // O 'AreaPersonale' se preferisci
                    }}
                >
                    <Ionicons name="person-circle-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>Area Personale</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { logout(); setMenuVisible(false); }}>
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
            {/* Confini Italia Semplificati */}
            {ItalyBoundary && (
                <Geojson 
                    geojson={ItalyBoundary} 
                    strokeColor="#467599" 
                    fillColor="rgba(70, 117, 153, 0.05)" 
                    strokeWidth={2} 
                />
            )}

            {MOCK_TICKETS.map(t => (
              <Marker 
                key={t.id} 
                coordinate={{ latitude: t.lat, longitude: t.lon }}
                onCalloutPress={() => navigation.navigate('TicketDetail', { ticket: t })}
              >
                <View style={[styles.markerCircle, {backgroundColor: t.status === 'Risolto' ? '#4CAF50' : '#D32F2F'}]}>
                  <Ionicons name="alert" size={16} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* ZOOM CONTROLS */}
          <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(1)}><Ionicons name="add" size={24} color="#333" /></TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-1)}><Ionicons name="remove" size={24} color="#333" /></TouchableOpacity>
          </View>

          {/* FAB - Solo se Cittadino o Ospite */}
          {(!user || user.role === 'cittadino') && (
              <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate(user ? 'CreateTicket' : 'AuthModal')}>
                  <Ionicons name="add" size={32} color="white" />
              </TouchableOpacity>
          )}

          {/* VISTE PER RUOLI */}
          {user?.role === 'responsabile' && renderManagerPanel()}
          {user?.role === 'operatore' && renderOperatorPanel()}

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
  
  // STILI PER LA NUOVA NOTIFICA
  notifBtn: { marginRight: 15, padding: 5, position: 'relative' },
  badgeDot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C06E52', borderWidth: 1, borderColor: '#1F2937' },

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
  
  fab: { 
    position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, 
    backgroundColor: '#467599', 
    justifyContent: 'center', alignItems: 'center', elevation: 8 
  },

  rolePanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, elevation: 15, shadowColor: '#000', shadowOpacity: 0.2 },
  panelTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  statGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, borderLeftWidth: 4, elevation: 2 },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
  subHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  listItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  badge: { backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, color: '#00695C', fontWeight: 'bold' }
});