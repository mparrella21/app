import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Alert, BackHandler, Modal, FlatList, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, Geojson } from 'react-native-maps';
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import SearchBar from '../component/SearchBar';
import { searchCity } from '../services/nominatim';
import { getAllTickets } from '../services/ticketService'; 
import { searchTenantByCoordinates, getAllTenants } from '../services/tenantService'; // Assicurati di importare getAllTenants

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth(); 
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef(null);
  
  const [tickets, setTickets] = useState([]); 
  const [currentBoundary, setCurrentBoundary] = useState(null); 
  const [activeTenantId, setActiveTenantId] = useState(null);
  const [activeTenantName, setActiveTenantName] = useState("Rilevamento..."); // Per visualizzare il nome

  // Stati per il selettore manuale del comune
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [allTenants, setAllTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  const [region, setRegion] = useState({
      latitude: 41.8719, longitude: 12.5674,
      latitudeDelta: 6, longitudeDelta: 6,
  });

  const getNormalizedRole = () => {
      if (!user || !user.role) return '';
      const r = String(user.role).toLowerCase();
      if (r === '1' || r === 'operatore') return 'operatore';
      if (r === '2' || r === 'responsabile') return 'responsabile'; 
      if (r === '3' || r === 'admin') return 'admin';
      return 'cittadino'; 
  };
  const currentRole = getNormalizedRole();

  // --- GESTIONE TASTO INDIETRO ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (menuVisible) {
          setMenuVisible(false);
          return true; 
        }
        Alert.alert("Uscita", "Vuoi uscire dall'app?", [
          { text: "No", onPress: () => null, style: "cancel" },
          { text: "Sì", onPress: () => BackHandler.exitApp() }
        ]);
        return true; 
      };

      // NUOVA SINTASSI: Salva la sottoscrizione
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Rimuovi usando .remove()
      return () => subscription.remove();
    }, [menuVisible]) 
  );

  // Carica i ticket quando cambia il Tenant attivo
  useEffect(() => {
      if (activeTenantId) {
          fetchTickets(activeTenantId);
      } else {
          setTickets([]);
      }
  }, [activeTenantId]);

  useFocusEffect(
    useCallback(() => {
      if (activeTenantId) fetchTickets(activeTenantId);
    }, [activeTenantId])
  );

  const fetchTickets = async (tenantId) => {
    try {
      const allData = await getAllTickets(tenantId);
      setTickets(allData);
    } catch (e) { console.error(e); }
  };

  // Inizializzazione: Posizione e lista Tenant
  useEffect(() => {
    (async () => {
      // 1. Carica la lista di tutti i comuni (tenants) disponibili per il selettore
      loadAllTenants();

      // 2. Rileva posizione utente
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
          
          // Cerca il tenant alla posizione corrente
          await checkTenantAtLocation(loc.coords.latitude, loc.coords.longitude);
        } else {
            // Se non permessi GPS, forza selezione manuale
            Alert.alert("Permessi GPS negati", "Seleziona manualmente il comune.");
            setTenantModalVisible(true);
        }
      } catch (e) { 
          console.log("Errore GPS", e);
          Alert.alert("Errore GPS", "Impossibile rilevare la posizione. Seleziona manualmente il comune.");
          setTenantModalVisible(true);
      }
    })();
  }, []);

  const loadAllTenants = async () => {
      setLoadingTenants(true);
      try {
          const tenants = await getAllTenants();
          setAllTenants(tenants || []);
      } catch (e) {
          console.error("Errore caricamento tenants", e);
      } finally {
          setLoadingTenants(false);
      }
  };

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
        checkTenantAtLocation(result.lat, result.lon);
    } else {
        Alert.alert("Non trovato", "Luogo non trovato.");
    }
  };

  const checkTenantAtLocation = async (lat, lon) => {
      try {
          const result = await searchTenantByCoordinates(lat, lon);
          if (result && result.tenant && result.tenant.id) {
              setCurrentBoundary(result.boundary);
              setActiveTenantId(result.tenant.id);
              setActiveTenantName(result.tenant.name);
          } else {
              // Tenant non trovato alla posizione corrente
              setCurrentBoundary(null);
              setActiveTenantId(null);
              setActiveTenantName("Nessun comune servito qui");
              
              // Mostra Alert e apri modale selezione
              Alert.alert(
                  "Zona non coperta", 
                  "La tua posizione attuale non corrisponde a un comune gestito dal servizio. Seleziona un comune dalla lista.",
                  [{ text: "Seleziona Comune", onPress: () => setTenantModalVisible(true) }]
              );
          }
      } catch (e) { console.error("Errore boundary:", e); }
  };

  const handleManualTenantSelect = (tenant) => {
      setActiveTenantId(tenant.id);
      setActiveTenantName(tenant.label); // <--- CAMBIATO da .name a .label
      setTenantModalVisible(false);
      
      Alert.alert("Comune Selezionato", `Ora visualizzi le segnalazioni di: ${tenant.label}`); // <--- CAMBIATO
      fetchTickets(tenant.id); // Forziamo il caricamento immediato
  };

  const handleZoom = (amount) => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom += amount;
      mapRef.current.animateCamera(cam);
    });
  };

  const getStatusColor = (status) => {
      const s = status ? String(status).toLowerCase() : '';
      if (s === '3' || s === 'risolto' || s === 'chiuso') return '#4CAF50'; 
      if (s === '2' || s === 'in corso' || s === 'assegnato') return 'orange';
      return '#D32F2F'; 
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.navBarContent}>
            <View style={styles.searchContainer}>
               <SearchBar onSearch={handleSearch} />
            </View>

            {/* RIMOSSO PULSANTE NOTIFICHE */}

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
        <TouchableOpacity style={styles.tenantBar} onPress={() => setTenantModalVisible(true)}>
            <Ionicons name="location" size={16} color="white" />
            <Text style={styles.tenantBarText}>
                {activeTenantName || "Seleziona Comune"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>
        {menuVisible && user && (
            <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{currentRole.toUpperCase()}</Text>
                </View>
                <View style={styles.divider}/>
                {currentRole === 'cittadino' && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { 
                      setMenuVisible(false); 
                      navigation.navigate('CitizenHome', { 
                          passedTenantId: activeTenantId, 
                          passedTenantName: activeTenantName 
                      }); 
                  }}> 
                      <Ionicons name="home" size={20} color="#333" />
                      <Text style={styles.menuText}>Home Cittadino</Text>
                  </TouchableOpacity>
                )}
                {currentRole === 'operatore' && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('OperatorHome'); }}> 
                      <Ionicons name="construct" size={20} color="#333" />
                      <Text style={styles.menuText}>Dashboard Operatore</Text>
                  </TouchableOpacity>
                )}
                {currentRole === 'responsabile' && (
                  <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('ResponsibleHome'); }}> 
                      <Ionicons name="business" size={20} color="#333" />
                      <Text style={styles.menuText}>Dashboard Responsabile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('StatsDashboard'); }}> 
                      <Ionicons name="stats-chart" size={20} color="#333" />
                      <Text style={styles.menuText}>Statistiche Avanzate</Text>
                  </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Profile', { activeTenantName }); }}> 
                    <Ionicons name="person" size={20} color="#333" />
                    <Text style={styles.menuText}>Profilo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { 
                    logout(); 
                    setMenuVisible(false); 
                }}>
                    <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
                    <Text style={[styles.menuText, {color: '#d32f2f'}]}>Logout</Text>
                </TouchableOpacity>
            </View>
        )}
      </SafeAreaView>

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
                    onCalloutPress={() => navigation.navigate('TicketDetail', { id: t.id, tenant_id: activeTenantId })}
                  >
                    <View style={[styles.markerCircle, {backgroundColor: getStatusColor(t.id_status || t.status)}]}>
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
          
          {(!user || currentRole === 'cittadino') && (
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate(user ? 'CreateTicket' : 'AuthModal')}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
          )}
      </View>

      {/* MODALE SELEZIONE COMUNE */}
      <Modal visible={tenantModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Seleziona un Comune</Text>
                  {loadingTenants ? (
                      <ActivityIndicator size="large" color="#467599" />
                  ) : (
                      <FlatList 
                          data={allTenants}
                          keyExtractor={(item) => String(item.id)}
                          renderItem={({ item }) => (
                              <TouchableOpacity style={styles.tenantItem} onPress={() => handleManualTenantSelect(item)}>
                                  {/* CORREZIONE QUI SOTTO: usa .label e .provincia_label */}
                                  <Text style={styles.tenantName}>
                                      {item.label} ({item.provincia_label || '?'})
                                  </Text>
                                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                              </TouchableOpacity>
                          )}
                          style={{maxHeight: 400}}
                      />
                  )}
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setTenantModalVisible(false)}>
                      <Text style={styles.closeModalText}>Chiudi</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  headerContainer: { backgroundColor: '#1F2937', zIndex: 10, elevation: 5 },
  navBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  searchContainer: { flex: 1, marginRight: 15 },
  userContainer: { justifyContent: 'center' }, 
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' },
  avatarText: { color: 'white', fontWeight: 'bold' },
  loginLinkBtn: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  loginLinkText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  // STILI NUOVI PER LA BARRA COMUNE
  tenantBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#374151', paddingVertical: 8, marginHorizontal: 15, marginBottom: 10, borderRadius: 8 },
  tenantBarText: { color: 'white', fontWeight: 'bold', marginHorizontal: 8, fontSize: 14 },

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
  zoomControls: { position: 'absolute', right: 15, top: 80, backgroundColor: 'white', borderRadius: 8, elevation: 5 },
  zoomBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#eee', width: '80%', alignSelf: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // STILI MODALE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#1D2D44' },
  tenantItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tenantName: { fontSize: 16, color: '#333' },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: '#ddd', borderRadius: 8, alignItems: 'center' },
  closeModalText: { fontWeight: 'bold', color: '#333' }
});