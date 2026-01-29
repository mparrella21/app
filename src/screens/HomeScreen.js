import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, ScrollView } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';

const { width, height } = Dimensions.get('window');

// Dati finti per i ruoli
const TICKET_OPERATORE = [
  { id: 1, title: 'Buca Stradale', lat: 41.9028, lon: 12.4964, status: 'Aperto' },
  { id: 2, title: 'Lampione Rotto', lat: 41.8905, lon: 12.4942, status: 'In Corso' },
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); // Recuperiamo l'utente loggato
  const [menuOpen, setMenuOpen] = useState(false);

  // Seleziona la view in base al ruolo
  const renderDashboard = () => {
    if (!user) return null;

    if (user.role === 'operatore') {
      return (
        <View style={styles.rolePanel}>
          <Text style={styles.roleTitle}>🛠 Modalità Operatore</Text>
          <Text style={styles.roleSub}>Hai {TICKET_OPERATORE.length} interventi assegnati.</Text>
          <ScrollView style={{ maxHeight: 150, marginTop: 10 }}>
            {TICKET_OPERATORE.map(t => (
              <View key={t.id} style={styles.taskCard}>
                <Ionicons name="construct" size={16} color="#d32f2f" />
                <Text style={{ marginLeft: 5, flex: 1 }}>{t.title}</Text>
                <Text style={{ fontSize: 10, color: 'orange' }}>{t.status}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (user.role === 'responsabile') {
      return (
        <View style={styles.rolePanel}>
          <Text style={styles.roleTitle}>📊 Dashboard Responsabile</Text>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>12</Text>
              <Text style={styles.statLabel}>Aperti</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>5</Text>
              <Text style={styles.statLabel}>Chiusi</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>3</Text>
              <Text style={styles.statLabel}>Urgenti</Text>
            </View>
          </View>
        </View>
      );
    }

    return null; // Cittadino vede solo mappa standard
  };

  return (
    <View style={styles.container}>
      
      {/* 1. MAPPA (Limitata all'Italia) */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 41.8719,
          longitude: 12.5674, // Centro Italia
          latitudeDelta: 6,
          longitudeDelta: 6,
        }}
        minZoomLevel={5} // Evita di uscire troppo
      >
        {/* Mostra marker se sei Operatore */}
        {user?.role === 'operatore' && TICKET_OPERATORE.map(t => (
          <Marker 
            key={t.id} 
            coordinate={{ latitude: t.lat, longitude: t.lon }}
            title={t.title}
            pinColor="orange"
          />
        ))}
      </MapView>

      {/* 2. UI OVERLAY */}
      <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
        
        {/* Header */}
        <View style={styles.headerRow} pointerEvents="box-none">
          <View style={styles.searchWrapper}>
            <SearchBar />
          </View>

          {/* Avatar Menu */}
          <TouchableOpacity 
            style={[styles.profileButton, user && styles.profileActive]} 
            onPress={() => user ? setMenuOpen(!menuOpen) : navigation.navigate('AuthModal')}
          >
            <Ionicons name="person" size={24} color={user ? "white" : "#1D2D44"} />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu (Logout) */}
        {menuOpen && user && (
          <View style={styles.dropdown}>
            <Text style={{fontWeight:'bold', marginBottom:5}}>{user.name}</Text>
            <Text style={{fontSize:12, color:'#666', marginBottom:10}}>{user.role.toUpperCase()}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); setMenuOpen(false); }}>
              <Text style={{color:'white', fontSize:12}}>Esci</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pannello Specifico Ruolo (In basso o laterale) */}
        {renderDashboard()}

        {/* Tasto Segnalazione (Solo per Cittadino) */}
        {user?.role === 'cittadino' && (
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: width, height: height, position: 'absolute', top: 0, left: 0 },
  uiContainer: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 },
  searchWrapper: { flex: 1, marginRight: 10, zIndex: 20 },
  profileButton: {
    width: 45, height: 45, backgroundColor: 'white', borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', elevation: 5,
    borderWidth: 1, borderColor: '#eee',
  },
  profileActive: { backgroundColor: '#4A769E', borderColor: '#1D2D44' },
  
  // Dropdown Menu
  dropdown: {
    position: 'absolute', top: 70, right: 15, backgroundColor: 'white',
    padding: 15, borderRadius: 10, elevation: 10, zIndex: 30, minWidth: 150
  },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 8, borderRadius: 5, alignItems: 'center' },

  // Role Dashboard Panel (Operatore/Resp)
  rolePanel: {
    position: 'absolute', bottom: 30, left: 15, right: 15,
    backgroundColor: 'white', padding: 15, borderRadius: 15,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2,
  },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1D2D44' },
  roleSub: { fontSize: 12, color: '#666', marginBottom: 10 },
  
  // Task Card
  taskCard: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 5
  },
  
  // Stats
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#4A769E' },
  statLabel: { fontSize: 12, color: '#666' },

  // FAB (Cittadino)
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center',
    elevation: 8
  }
});