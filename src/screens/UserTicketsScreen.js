import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; 
import { getUserTickets } from '../services/ticketService'; 

export default function UserTicketsScreen({ navigation }) {
  const { user } = useAuth(); 
  const [myTickets, setMyTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NUOVO: Stato per il filtro attivo
  const [filterStatus, setFilterStatus] = useState('Tutti');

  const loadTickets = async () => {
    if (!user || !user.tenant_id) return; // Controllo di sicurezza
    setLoading(true);
    try {
      // CORREZIONE: Aggiunto user.tenant_id come secondo parametro
      const tickets = await getUserTickets(user.id, user.tenant_id);
      setMyTickets(tickets);
      setFilteredTickets(tickets); 
      setFilterStatus('Tutti');
    } catch (error) {
      console.error("Errore caricamento ticket personali:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTickets();
    });
    return unsubscribe;
  }, [navigation, user]);

  // NUOVO: Effetto per filtrare la lista in base al tab selezionato
  useEffect(() => {
    if (filterStatus === 'Tutti') {
      setFilteredTickets(myTickets);
    } else {
      const filtered = myTickets.filter(ticket => {
        const s = (ticket.status || ticket.stato || '').toLowerCase();
        if (filterStatus === 'Aperti') return s === 'aperto' || s === 'open' || s === 'ricevuto';
        if (filterStatus === 'In Lavorazione') return s === 'in corso' || s === 'in_progress' || s === 'assegnato' || s === 'working';
        if (filterStatus === 'Risolti') return s === 'risolto' || s === 'resolved' || s === 'chiuso' || s === 'closed';
        return false;
      });
      setFilteredTickets(filtered);
    }
  }, [filterStatus, myTickets]);

  const getStatusColor = (status) => {
    const s = status ? String(status).toLowerCase() : '';
    if (s === 'aperto' || s === 'open') return '#D32F2F'; 
    if (s === 'in corso' || s === 'in_progress' || s === 'assegnato') return '#F59E0B'; 
    if (s === 'risolto' || s === 'resolved' || s === 'chiuso') return '#4CAF50'; 
    return '#999';
  };

  // NUOVO: Componente per i Tab di Filtro
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
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { id: item.id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{item.category || item.categoria || 'Generico'}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status || item.stato) }]}>
          <Text style={styles.badgeText}>{(item.status || item.stato || 'Aperto').toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.title || item.titolo}</Text>
      <Text style={styles.date}>
        Segnalato il {item.date ? new Date(item.date).toLocaleDateString() : (item.creation_date || 'N/D')}
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
            <Text style={styles.headerTitle}>Le Mie Segnalazioni</Text>
            <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>

      {/* NUOVO: Barra dei filtri orizzontale */}
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
            <Text style={{marginTop:10, color:'#666'}}>Caricamento...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderItem}
          keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadTickets}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>
                {filterStatus === 'Tutti' ? "Non hai ancora inviato segnalazioni." : `Nessuna segnalazione "${filterStatus}".`}
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
  
  // NUOVO: Stili per i filtri
  filtersWrapper: { backgroundColor: 'white', paddingVertical: 10, elevation: 2 },
  scrollFilters: { paddingHorizontal: 15 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 8, justifyContent:'center' },
  activeFilterTab: { backgroundColor: '#467599' },
  filterText: { color: '#333', fontWeight: '600', fontSize: 13 },
  activeFilterText: { color: 'white' },

  listContent: { padding: 15 },
  
  // Ripristinate le ombreggiature più ricche per iOS (shadow*)
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