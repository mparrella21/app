import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext'; 
import { getUserTickets } from '../services/ticketService'; 
import { searchTenantByCoordinates } from '../services/tenantService';

export default function UserTicketsScreen({ navigation }) {
  const { user } = useAuth(); 
  const [myTickets, setMyTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState('Tutti');

  // 1. Determina posizione e Tenant
  const loadContext = async () => {
      setLoading(true);
      try {
          // Se l'utente ha un tenant fisso (es. Responsabile), usiamo quello
          if (user.tenant_id) {
              await loadTickets(user.tenant_id);
              return;
          }

          // Altrimenti usiamo il GPS (Cittadino)
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({});
              const result = await searchTenantByCoordinates(loc.coords.latitude, loc.coords.longitude);
              
              if (result && result.tenant) {
                  setCurrentTenant(result.tenant);
                  await loadTickets(result.tenant.id);
              } else {
                  Alert.alert("Info", "Non sei in una zona coperta. Impossibile caricare lo storico locale.");
                  setMyTickets([]);
                  setFilteredTickets([]);
              }
          }
      } catch (error) {
          console.error("Errore context", error);
      } finally {
          setLoading(false);
      }
  };

  // 2. Carica i ticket dell'utente IN QUEL TENANT
  const loadTickets = async (tenantId) => {
    try {
      // getUserTickets filtra già per user_id lato client o server
      const tickets = await getUserTickets(user.id, tenantId);
      setMyTickets(tickets);
      setFilteredTickets(tickets); 
    } catch (error) {
      console.error("Errore caricamento ticket personali:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
        loadContext();
    }, [])
  );

  // Effetto Filtri UI
  useEffect(() => {
    if (filterStatus === 'Tutti') {
      setFilteredTickets(myTickets);
    } else {
      const filtered = myTickets.filter(ticket => {
        const s = String(ticket.id_status || ticket.status || '').toLowerCase();
        if (filterStatus === 'Aperti') return s === '1' || s === 'aperto';
        if (filterStatus === 'In Lavorazione') return s === '2' || s === 'in corso';
        if (filterStatus === 'Risolti') return s === '3' || s === 'risolto';
        return false;
      });
      setFilteredTickets(filtered);
    }
  }, [filterStatus, myTickets]);

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    if (s === '1' || s === 'aperto') return '#D32F2F'; 
    if (s === '2' || s === 'in corso') return '#F59E0B'; 
    if (s === '3' || s === 'risolto') return '#4CAF50'; 
    return '#999';
  };

  const getStatusText = (status) => {
      const s = String(status).toLowerCase();
      if (s === '1') return 'APERTO';
      if (s === '2') return 'IN LAVORAZIONE';
      if (s === '3') return 'RISOLTO';
      return 'CHIUSO';
  };

  const FilterTab = ({ label }) => (
    <TouchableOpacity 
      style={[styles.filterTab, filterStatus === label && styles.activeFilterTab]} 
      onPress={() => setFilterStatus(label)}
    >
      <Text style={[styles.filterText, filterStatus === label && styles.activeFilterText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    // PASSAGGIO TENANT ID ANCHE QUI
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { id: item.id, tenant_id: currentTenant?.id || user.tenant_id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>Segnalazione #{item.id}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.id_status || item.status) }]}>
          <Text style={styles.badgeText}>{getStatusText(item.id_status || item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.date}>
        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Data N/D'}
      </Text>
      
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
        <Text style={styles.detailsLink}>Visualizza dettagli</Text>
        <Ionicons name="chevron-forward" size={16} color="#467599" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerTitle}>Le Mie Segnalazioni</Text>
                {currentTenant && <Text style={{color:'rgba(255,255,255,0.7)', fontSize:10, textAlign:'center'}}>{currentTenant.name}</Text>}
            </View>
            <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollFilters}>
          <FilterTab label="Tutti" />
          <FilterTab label="Aperti" /> 
          <FilterTab label="In Lavorazione" />
          <FilterTab label="Risolti" />
        </ScrollView>
      </View>

      {loading ? (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#467599" />
            <Text style={{marginTop:10, color:'#666'}}>Ricerca ticket locali...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadContext}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>
                {filterStatus === 'Tutti' ? "Non hai segnalazioni in questo comune." : `Nessuna segnalazione "${filterStatus}".`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#1F2937', paddingBottom: 15, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  
  filtersWrapper: { backgroundColor: 'white', paddingVertical: 10, elevation: 2 },
  scrollFilters: { paddingHorizontal: 15 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 8, justifyContent:'center' },
  activeFilterTab: { backgroundColor: '#467599' },
  filterText: { color: '#333', fontWeight: '600', fontSize: 13 },
  activeFilterText: { color: 'white' },

  listContent: { padding: 15 },
  
  card: { 
      backgroundColor: 'white', 
      borderRadius: 10, 
      padding: 15, 
      marginBottom: 15, 
      elevation: 2, 
      shadowColor: '#000', 
      shadowOpacity: 0.1, 
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  category: { fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  date: { fontSize: 12, color: '#999' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsLink: { color: '#467599', fontWeight: 'bold', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10 }
});