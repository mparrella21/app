import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, ScrollView, StatusBar } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, Geojson } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';

// IMPORTA IL FILE GEOJSON (Assicurati che il percorso sia corretto)
import ItalyBoundary from '../assets/data/limits_IT_simplified.json'; 

const { width, height } = Dimensions.get('window');

// DATI STATICI (Mock per simulare il DB)
const ALL_TICKETS = [
  { id: 1, title: 'Buca pericolosa', category: 'Strade', description: 'Via Roma dissestata', lat: 40.682, lon: 14.768, status: 'Aperto', author: 'Giuseppe Bianchi', date: '29/01/2026', assignee: null },
  { id: 2, title: 'Lampione spento', category: 'Illuminazione', description: 'Non si vede nulla', lat: 40.679, lon: 14.765, status: 'In Corso', author: 'Anna Neri', date: '28/01/2026', assignee: 'operatore@test.it' },
  { id: 3, title: 'Rifiuti abbandonati', category: 'Ambiente', description: 'Sacchetti in strada', lat: 40.685, lon: 14.770, status: 'Risolto', author: 'Mario Rossi', date: '25/01/2026', assignee: 'operatore@test.it' },
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); 
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef(null);

  // Zoom Manuale
  const handleZoom = (amount) => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom += amount;
      mapRef.current.animateCamera(cam);
    });
  };

  // --- INTERFACCE SPECIFICHE PER RUOLO  ---

  // VISTA RESPONSABILE: Dashboard Statistiche 
  const renderResponsabileView = () => (
    <View style={styles.dashboardPanel}>
      <Text style={styles.panelTitle}>Dashboard {user.municipality}</Text>
      
      {/* Statistiche Rapide */}
      <View style={styles.statRow}>
        <View style={[styles.statBox, {borderLeftColor: '#D32F2F'}]}>
          <Text style={styles.statNum}>{ALL_TICKETS.filter(t => t.status === 'Aperto').length}</Text>
          <Text style={styles.statLabel}>Da Assegnare</Text>
        </View>
        <View style={[styles.statBox, {borderLeftColor: 'orange'}]}>
          <Text style={styles.statNum}>{ALL_TICKETS.filter(t => t.status === 'In Corso').length}</Text>
          <Text style={styles.statLabel}>In Corso</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Ticket Recenti</Text>
      <ScrollView style={{height: 200}}>
        {ALL_TICKETS.map(t => (
          <TouchableOpacity key={t.id} style={styles.ticketItem} onPress={() => navigation.navigate('TicketDetail', { ticket: t })}>
            <Ionicons name={t.status === 'Risolto' ? "checkmark-circle" : "alert-circle"} size={24} color={t.status === 'Aperto' ? '#D32F2F' : '#467599'} />
            <View style={{marginLeft: 10, flex: 1}}>
              <Text style={styles.ticketTitle}>{t.title}</Text>
              <Text style={styles.ticketSub}>{t.category} • {t.author}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // VISTA OPERATORE: Lista incarichi 
  const renderOperatoreView = () => (
    <View style={styles.dashboardPanel}>
      <Text style={styles.panelTitle}>I Miei Incarichi</Text>
      <ScrollView>
        {ALL_TICKETS.filter(t => t.status === 'In Corso' || t.assignee === user.email).map(t => (
          <TouchableOpacity key={t.id} style={styles.ticketItem} onPress={() => navigation.navigate('TicketDetail', { ticket: t })}>
            <Ionicons name="construct" size={24} color="orange" />
            <View style={{marginLeft: 10, flex: 1}}>
              <Text style={styles.ticketTitle}>{t.title}</Text>
              <Text style={styles.ticketSub}>Assegnato il {t.date}</Text>
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>IN CARICO</Text></View>
          </TouchableOpacity>
        ))}
        {ALL_TICKETS.filter(t => t.status === 'In Corso' || t.assignee === user.email).length === 0 && (
            <Text style={{textAlign: 'center', marginTop: 20, color: '#666'}}>Nessun ticket assegnato al momento.</Text>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* HEADER NAVBAR (Stile Sito) */}
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.navBarContent}>
            {/* SearchBar Bianca */}
            <View style={styles.searchContainer}>
               <SearchBar />
            </View>

            {/* Profilo Utente */}
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

        {/* Menu Dropdown */}
        {menuVisible && user && (
            <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
                </View>
                <View style={styles.divider}/>
                <TouchableOpacity style={styles.menuItem} onPress={() => { logout(); setMenuVisible(false); }}>
                    <Ionicons name="log-out-outline" size={18} color="#d32f2f" />
                    <Text style={[styles.menuText, {color: '#d32f2f'}]}>Esci</Text>
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
            initialRegion={{
              latitude: 40.682, longitude: 14.768, latitudeDelta: 0.05, longitudeDelta: 0.05, // Salerno (Default)
            }}
            rotateEnabled={false} 
          >
            {/* CONFINI ITALIA [cite: 304] */}
            {ItalyBoundary && (
                <Geojson 
                    geojson={ItalyBoundary} 
                    strokeColor="#467599" 
                    fillColor="rgba(70, 117, 153, 0.05)" 
                    strokeWidth={2} 
                />
            )}

            {/* MARKERS (Visibili a tutti, filtrati per logica backend futura) */}
            {ALL_TICKETS.map(t => (
              <Marker 
                key={t.id} 
                coordinate={{ latitude: t.lat, longitude: t.lon }}
                onCalloutPress={() => navigation.navigate('TicketDetail', { ticket: t })}
              >
                <View style={[styles.markerCircle, {backgroundColor: t.status === 'Risolto' ? '#4CAF50' : '#D32F2F'}]}>
                  <Ionicons name={t.status === 'Risolto' ? "checkmark" : "alert"} size={16} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* UI SPECIFICA PER RUOLO (Sopra la mappa) */}
          
          {/* CITTADINO (o Non Loggato): Vede FAB e Zoom  */}
          {(!user || user.role === 'cittadino') && (
            <>
                <View style={styles.zoomControls}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(1)}><Ionicons name="add" size={24} color="#333" /></TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-1)}><Ionicons name="remove" size={24} color="#333" /></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate(user ? 'CreateTicket' : 'AuthModal')}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </>
          )}

          {/* RESPONSABILE: Pannello di Controllo [cite: 42, 43] */}
          {user?.role === 'responsabile' && renderResponsabileView()}

          {/* OPERATORE: Lista Task  */}
          {user?.role === 'operatore' && renderOperatoreView()}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  
  // NAVBAR
  headerContainer: { backgroundColor: '#1F2937', zIndex: 10, elevation: 5 },
  navBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  searchContainer: { flex: 1, marginRight: 15 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loginLinkBtn: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  loginLinkText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // DROPDOWN
  dropdownMenu: { position: 'absolute', top: 60, right: 10, backgroundColor: 'white', borderRadius: 8, elevation: 10, zIndex: 20, minWidth: 160 },
  dropdownHeader: { padding: 15, backgroundColor: '#F3F4F6', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  userName: { fontWeight: 'bold', color: '#1F2937' },
  userRole: { fontSize: 10, color: '#666' },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, fontSize: 14, color: '#374151' },

  // MAPPA
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },
  markerCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', elevation: 3 },

  // UI CONTROLS CITTADINO
  zoomControls: { position: 'absolute', right: 15, top: 20, backgroundColor: 'white', borderRadius: 8, elevation: 5 },
  zoomBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#eee', width: '80%', alignSelf: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // PANNELLI RESPONSABILE / OPERATORE
  dashboardPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, elevation: 15 },
  panelTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderLeftWidth: 4, marginRight: 10 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#666' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 5 },
  ticketItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ticketTitle: { fontWeight: 'bold', color: '#1F2937' },
  ticketSub: { fontSize: 12, color: '#666' },
  badge: { backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, color: '#00695C', fontWeight: 'bold' }
});