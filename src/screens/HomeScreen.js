import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, Image, StatusBar } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';

// IMPORTA GEOJSON SE VUOI (Decommenta se hai il file)
// import ItalyBoundary from '../assets/data/italy.json'; 

const { width, height } = Dimensions.get('window');

// DATI STATICI DI ESEMPIO
const STATIC_TICKETS = [
  { id: 1, title: 'Buca pericolosa', category: 'Strade', description: 'Via del Corso dissestata', lat: 41.9028, lon: 12.4964, status: 'Aperto', author: 'Mario Rossi', date: '29/01/2026' },
  { id: 2, title: 'Lampione spento', category: 'Illuminazione', description: 'Non si vede nulla di notte', lat: 41.8905, lon: 12.4942, status: 'In Corso', author: 'Luigi Verdi', date: '28/01/2026' },
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); 
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef(null);

  const handleZoom = (amount) => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom += amount;
      mapRef.current.animateCamera(cam);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* 1. HEADER BLU (NAVBAR) FISSO IN ALTO */}
      {/* Questo è il rettangolo blu che contiene tutto, come nel sito */}
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.navBarContent}>
            
            {/* LOGO / NOME SITO (Opzionale, se c'è nel sito) */}
            {/* <Text style={styles.logoText}>CIVITAS</Text> */}

            {/* SEARCH BAR (Bianca dentro il blu) */}
            <View style={styles.searchContainer}>
               <SearchBar />
            </View>

            {/* ZONA UTENTE (A destra dentro il blu) */}
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

        {/* MENU A TENDINA (DROPDOWN) */}
        {menuVisible && user && (
            <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role}</Text>
                </View>
                <View style={styles.divider}/>
                <TouchableOpacity style={styles.menuItem} onPress={() => alert('Area Personale')}>
                    <Ionicons name="person-outline" size={18} color="#333" />
                    <Text style={styles.menuText}>Area Personale</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { logout(); setMenuVisible(false); }}>
                    <Ionicons name="log-out-outline" size={18} color="#d32f2f" />
                    <Text style={[styles.menuText, {color: '#d32f2f'}]}>Esci</Text>
                </TouchableOpacity>
            </View>
        )}
      </SafeAreaView>

      {/* 2. MAPPA A TUTTO SCHERMO SOTTO L'HEADER */}
      <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: 41.8719, longitude: 12.5674, latitudeDelta: 5, longitudeDelta: 5,
            }}
            rotateEnabled={false} 
          >
            {/* Decommenta se hai il GeoJSON */}
            {/* <Geojson geojson={ItalyBoundary} strokeColor="#467599" fillColor="rgba(70, 117, 153, 0.1)" strokeWidth={2} /> */}

            {STATIC_TICKETS.map(t => (
              <Marker 
                key={t.id} 
                coordinate={{ latitude: t.lat, longitude: t.lon }}
                onCalloutPress={() => navigation.navigate('TicketDetail', { ticket: t })}
              >
                <View style={styles.markerCircle}>
                  <Ionicons name="location" size={18} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* 3. BOTTONI FLOTTANTI SULLA MAPPA */}
          
          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(1)}>
                  <Ionicons name="add" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-1)}>
                  <Ionicons name="remove" size={24} color="#333" />
              </TouchableOpacity>
          </View>

          {/* FAB (+) Aggiungi Segnalazione */}
          {user?.role !== 'responsabile' && (
              <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate(user ? 'CreateTicket' : 'AuthModal')}
              >
                  <Ionicons name="add" size={32} color="white" />
              </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' }, // Sfondo generale blu scuro (safe area top)

  // --- NAVBAR BLU (Header) ---
  headerContainer: {
    backgroundColor: '#1F2937', // Colore Navbar Sito
    zIndex: 10,
    elevation: 5, // Ombra Android
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.2 // Ombra iOS
  },
  navBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12, // Altezza navbar
    justifyContent: 'space-between',
  },
  logoText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginRight: 15 },
  
  searchContainer: {
    flex: 1, // Prende tutto lo spazio centrale
    marginRight: 15,
  },

  userContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stile Bottoni Header
  loginLinkBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  loginLinkText: { color: 'white', fontWeight: '600', fontSize: 14 },
  
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#374151', // Un po' più chiaro dello sfondo
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#4B5563'
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // --- DROPDOWN MENU ---
  dropdownMenu: {
    position: 'absolute',
    top: 70, // Subito sotto la navbar
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 0,
    elevation: 10,
    zIndex: 20,
    minWidth: 180,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  dropdownHeader: { padding: 15, backgroundColor: '#F3F4F6', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  userName: { fontWeight: 'bold', color: '#1F2937', fontSize: 14 },
  userRole: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, fontSize: 14, color: '#374151' },

  // --- MAPPA ---
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },

  markerCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#D32F2F', // Rosso marker
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white', shadowColor:'black', shadowOpacity:0.3, elevation:3
  },

  // --- CONTROLLI FLOTTANTI ---
  zoomControls: {
    position: 'absolute',
    bottom: 100, // Più in alto del FAB
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3
  },
  zoomBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#E5E7EB', width: '70%', alignSelf: 'center' },

  fab: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#D32F2F', // Rosso azione principale
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity: 0.3
  }
});