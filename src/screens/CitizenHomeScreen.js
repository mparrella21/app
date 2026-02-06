import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import { useFocusEffect } from '@react-navigation/native';

import { getAllTickets } from '../services/ticketService'; 
import { searchTenantByCoordinates } from '../services/tenantService';
import { useAuth } from '../context/AuthContext';

const COLORS = { primary: '#0077B6', bg: '#F3F4F6', card: '#FFF', accent: '#C06E52' };

const CitizenHomeScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); 
  const { passedTenantId, passedTenantName } = route.params || {};
  const [currentTenant, setCurrentTenant] = useState(null); 

  const initData = async () => {
      setLoading(true);
      
      if (passedTenantId && passedTenantName) {
          // CASO 1: Tenant passato dalla Home (Manuale o Rilevato là)
          console.log("Usando Tenant passato dalla Home:", passedTenantName);
          setCurrentTenant({ id: passedTenantId, name: passedTenantName });
          await loadTickets(passedTenantId);
      } else {
          // CASO 2: Nessun parametro, rileviamo da GPS (Fallback)
          console.log("Nessun parametro, rilevamento GPS locale...");
          await detectLocationAndTenant();
      }
      setLoading(false);
  };

  // 1. Rileva Posizione e Tenant
  const detectLocationAndTenant = async () => {
      try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
              setLoading(false);
              return;
          }
          const loc = await Location.getCurrentPositionAsync({});
          const result = await searchTenantByCoordinates(loc.coords.latitude, loc.coords.longitude);
          
          if (result && result.tenant) {
              setCurrentTenant(result.tenant); 
              loadTickets(result.tenant.id);
          } else {
              setLoading(false);
              Alert.alert("Fuori Zona", "Non siamo riusciti a identificare un comune coperto dal servizio in questa zona.");
          }
      } catch (e) {
          console.error(e);
          setLoading(false);
      }
  };

  // 2. Carica i ticket del tenant trovato
  const loadTickets = async (tenantId) => {
    try {
      if (!tenantId) return;
      const data = await getAllTickets(tenantId);
      setTickets(data || []);
    } catch (e) {
      console.warn('CitizenHomeScreen.load', e);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
        initData();
    }, [passedTenantId]) // Ricarica se cambia il tenant passato
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Se abbiamo un tenant corrente (da param o gps), ricarichiamo quello
    if (currentTenant?.id) {
        await loadTickets(currentTenant.id);
    } else {
        // Altrimenti riproviamo tutto il processo
        await initData();
    }
    setRefreshing(false);
  };

  // Filtro Tab
  const filteredTickets = tickets.filter(t => {
    // MODIFICA: Parsing status robusto (id_status o status)
    const s = String(t.id_status || t.status || '').toLowerCase();
    const isClosed = s === '3' || s === 'risolto' || s === 'chiuso' || s === 'closed';
    
    if (activeTab === 'active') return !isClosed;
    return isClosed;
  });

  const getStatusLabel = (t) => {
      const s = String(t.id_status || t.status || '').toLowerCase();
      if (s === '1' || s === 'aperto') return 'APERTO';
      if (s === '2' || s === 'in corso') return 'IN LAVORAZIONE';
      if (s === '3' || s === 'risolto') return 'RISOLTO';
      return 'CHIUSO';
  };

  const getStatusColor = (t) => {
      const label = getStatusLabel(t);
      if (label === 'RISOLTO') return '#D1E7DD'; 
      if (label === 'IN LAVORAZIONE') return '#FFF3CD'; 
      return '#F8D7DA'; 
  };
  
  const getStatusTextColor = (t) => {
      const label = getStatusLabel(t);
      if (label === 'RISOLTO') return '#0F5132'; 
      if (label === 'IN LAVORAZIONE') return '#856404'; 
      return '#721C24'; 
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity 
        style={styles.ticketCard} 
        onPress={() => navigation.navigate('TicketDetail', { id: item.id, tenant_id: currentTenant?.id })}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={24} color="#555" />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.ticketTitle} numberOfLines={1}>{item.title || 'Segnalazione'}</Text>
        
        {/* MODIFICA: Visualizzazione data corretta (creation_date o created_at) */}
        <Text style={styles.ticketSub}>
            #{item.id?.toString().substring(0,8)} • {item.creation_date ? new Date(item.creation_date).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/D')}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
        <Text style={{ color: getStatusTextColor(item), fontWeight: 'bold', fontSize: 10 }}>
          {getStatusLabel(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Ciao, {user?.name?.split(' ')[0] || 'Cittadino'}! 👋</Text>
          <Text style={styles.subText}>
              {currentTenant ? `Siamo a: ${currentTenant.name}` : 'Rilevamento posizione...'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'active' && styles.activeTab]} 
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>IN CORSO</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>RISOLTI</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={item => String(item.id)}
            renderItem={renderTicket}
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={
              <View style={{alignItems:'center', marginTop:50}}>
                <Ionicons name="folder-open-outline" size={48} color="#ccc" />
                <Text style={{color:'#999', marginTop:10}}>Nessuna segnalazione trovata qui.</Text>
              </View>
            }
          />
        )}
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTicket')}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20, paddingTop: 60,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.1, shadowRadius:4, elevation:5
  },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: '800' },
  subText: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 13 },
  
  body: { flex: 1, padding: 20, marginTop: -20 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, marginBottom: 15, elevation: 3 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: '#999', fontWeight: '600', fontSize:13 },
  activeTabText: { color: 'white' },
  
  ticketCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' },
  ticketTitle: { fontWeight: '700', fontSize: 16, color: '#1D3461', width: '90%' },
  ticketSub: { color: '#888', fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', elevation: 6 }
});

export default CitizenHomeScreen;