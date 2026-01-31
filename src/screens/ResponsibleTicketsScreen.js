import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTickets, closeTicket, getCategories } from '../services/ticketService';
import { getOperators } from '../services/userService'; 
import { assignTicketToOperator } from '../services/interventionService';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import EmptyState from '../component/EmptyState';

export default function ResponsibleTicketsScreen({ navigation }) {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  
  // Filtri
  const [filterStatus, setFilterStatus] = useState('Tutti'); 
  const [filterCategory, setFilterCategory] = useState('Tutte');
  const [filterTime, setFilterTime] = useState('Tutto'); // FIX: Nuovo filtro temporale (IF-3.1)
  
  // Dati di supporto
  const [operators, setOperators] = useState([]);
  const [categories, setCategories] = useState(['Tutte']);
  const [loading, setLoading] = useState(true);
  
  // Statistiche (IF-3.7)
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });

  // Stati Modale Assegnazione
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carica Ticket
      let t = await getAllTickets();
      setAllTickets(t);
      calculateStats(t); // Calcolo Stats iniziali
      
      // 2. Carica Operatori
      if (!OFFLINE_MODE) {
          const ops = await getOperators();
          setOperators(ops);
      }

      // 3. Carica Categorie
      const cats = await getCategories();
      const catList = cats.map(c => (typeof c === 'object' ? c.label : c));
      setCategories(['Tutte', ...catList]);

    } catch (e) {
      console.error("Errore caricamento responsabile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // FIX: Dashboard Statistiche (IF-3.7)
  const calculateStats = (tickets) => {
      const total = tickets.length;
      const open = tickets.filter(t => ['OPEN', 'APERTO', 'RICEVUTO'].includes((t.status||'').toUpperCase())).length;
      const closed = tickets.filter(t => ['CLOSED', 'RISOLTO', 'CHIUSO'].includes((t.status||'').toUpperCase())).length;
      setStats({ total, open, closed });
  };

  // Logica di Filtro Combinata (Stato AND Categoria AND Tempo)
  useEffect(() => {
    let result = allTickets;

    // 1. Filtro per Stato
    if (filterStatus !== 'Tutti') {
      let targetStatus = filterStatus;
      if (filterStatus === 'Aperti') targetStatus = 'OPEN';
      result = result.filter(t => {
         const s = (t.status || '').toUpperCase();
         // Mappatura semplificata per UI
         if (filterStatus === 'Aperti') return ['OPEN', 'APERTO', 'RICEVUTO'].includes(s);
         if (filterStatus === 'Risolti') return ['CLOSED', 'RISOLTO', 'CHIUSO'].includes(s);
         if (filterStatus === 'In Corso') return ['WORKING', 'IN CORSO', 'ASSEGNATO'].includes(s);
         return s === targetStatus.toUpperCase();
      });
    }

    // 2. Filtro per Categoria
    if (filterCategory !== 'Tutte') {
      result = result.filter(t => {
         const c = t.category || t.categoria || '';
         return c.toLowerCase() === filterCategory.toLowerCase();
      });
    }

    // 3. FIX: Filtro per Periodo Temporale (IF-3.1)
    if (filterTime !== 'Tutto') {
        const now = new Date();
        result = result.filter(t => {
            const tDate = new Date(t.creation_date || t.timestamp || t.date);
            const diffTime = Math.abs(now - tDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (filterTime === 'Oggi') return diffDays <= 1;
            if (filterTime === 'Settimana') return diffDays <= 7;
            if (filterTime === 'Mese') return diffDays <= 30;
            return true;
        });
    }

    setFilteredTickets(result);
  }, [filterStatus, filterCategory, filterTime, allTickets]);

  const openAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    setModalVisible(true);
  };

  const handleAssign = async (operatorId) => {
      if (!selectedTicket) return;
      const success = await assignTicketToOperator(selectedTicket.id, operatorId);
      if (success) {
          Alert.alert("Successo", "Intervento assegnato!");
          setModalVisible(false);
          loadData();
      } else {
          Alert.alert("Errore", "Assegnazione fallita.");
      }
  };

  const handleClose = async (id) => {
    const ok = await closeTicket(id);
    if (ok) {
      loadData();
      Alert.alert('Successo', 'Ticket chiuso con successo');
    } else {
      Alert.alert('Errore', 'Errore nella chiusura');
    }
  };

  const FilterTab = ({ label, selected, onSelect }) => (
    <TouchableOpacity 
      style={[styles.filterTab, selected === label && styles.activeFilterTab]} 
      onPress={() => onSelect(label)}
    >
      <Text style={[styles.filterText, selected === label && styles.activeFilterText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gestione Ticket</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="reload" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* FIX: Mini Dashboard Statistiche (IF-3.7) */}
      <View style={styles.statsContainer}>
          <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Totali</Text>
          </View>
          <View style={[styles.statBox, {borderLeftWidth:1, borderRightWidth:1, borderColor:'#eee'}]}>
              <Text style={[styles.statNumber, {color: COLORS.primary}]}>{stats.open}</Text>
              <Text style={styles.statLabel}>Aperti</Text>
          </View>
          <View style={styles.statBox}>
              <Text style={[styles.statNumber, {color: 'green'}]}>{stats.closed}</Text>
              <Text style={styles.statLabel}>Risolti</Text>
          </View>
      </View>
      
      {/* Area Filtri */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollFilters}>
          <FilterTab label="Tutti" selected={filterStatus} onSelect={setFilterStatus} />
          <FilterTab label="Aperti" selected={filterStatus} onSelect={setFilterStatus} /> 
          <FilterTab label="In Corso" selected={filterStatus} onSelect={setFilterStatus} />
          <FilterTab label="Risolti" selected={filterStatus} onSelect={setFilterStatus} />
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.scrollFilters, {marginTop: 8}]}>
          {categories.map((cat, index) => (
             <FilterTab key={index} label={cat} selected={filterCategory} onSelect={setFilterCategory} />
          ))}
        </ScrollView>

        {/* FIX: Filtro Temporale (IF-3.1) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.scrollFilters, {marginTop: 8}]}>
          {['Tutto', 'Oggi', 'Settimana', 'Mese'].map((t, index) => (
             <FilterTab key={index} label={t} selected={filterTime} onSelect={setFilterTime} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
      ) : (
        <FlatList 
            data={filteredTickets} 
            keyExtractor={i => String(i.id)} 
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({item}) => (
            <View style={styles.cardWrapper}>
                <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { ticketId: item.id })}>
                <View style={styles.cardHeader}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 4}}>
                    <Text style={styles.itemSub}>{new Date(item.creation_date || item.timestamp).toLocaleDateString()}</Text>
                    <Text style={[styles.itemSub, {fontWeight:'bold', color: COLORS.primary}]}>
                        {item.category || 'N/A'}
                    </Text>
                </View>
                <Text style={styles.itemSub}>{item.author || 'Cittadino'}</Text>
                </TouchableOpacity>
                
                <View style={styles.actionRow}>
                    {(['OPEN', 'APERTO', 'RICEVUTO'].includes((item.status||'').toUpperCase())) && (
                        <TouchableOpacity style={[styles.btnSmall, {backgroundColor: '#007BFF', marginRight: 8}]} onPress={() => openAssignModal(item)}>
                            <Text style={styles.btnTextSmall}>Assegna</Text>
                        </TouchableOpacity>
                    )}
                    
                    {!['RISOLTO', 'CHIUSO', 'CLOSED'].includes((item.status||'').toUpperCase()) && (
                    <TouchableOpacity style={[styles.btnSmall, {backgroundColor: COLORS.primary}]} onPress={() => handleClose(item.id)}>
                        <Text style={styles.btnTextSmall}>Chiudi</Text>
                    </TouchableOpacity>
                    )}
                </View>
            </View>
            )} 
            ListEmptyComponent={<EmptyState text="Nessun ticket trovato con questi filtri" />} 
        />
      )}

      {/* MODAL ASSEGNAZIONE */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Assegna Ticket</Text>
                <Text style={{marginBottom:15, color:'#666'}}>
                    Seleziona l'operatore per "{selectedTicket?.title}":
                </Text>
                
                <FlatList
                    data={operators}
                    keyExtractor={(item) => item.id.toString()}
                    style={{maxHeight: 300}}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.operatorItem} onPress={() => handleAssign(item.id)}>
                            <Ionicons name="person-circle-outline" size={36} color={COLORS.primary} />
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
                                <Text style={styles.operatorRole}>{item.role || 'Operatore'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" style={{marginLeft:'auto'}} />
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                    <Text style={{color:'red', fontWeight:'bold'}}>Annulla</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </View>
  )
}

const getStatusColor = (s) => {
  if(!s) return '#999';
  const status = s.toUpperCase();
  if(status === 'RISOLTO' || status === 'CHIUSO' || status === 'CLOSED') return '#4CAF50'; 
  if(status === 'IN CORSO' || status === 'WORKING' || status === 'ASSEGNATO') return '#F59E0B'; 
  return '#D32F2F'; 
};

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg || '#f5f5f5'},
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary || '#D32F2F'},
  
  // Stili Dashboard Statistiche
  statsContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase' },

  filtersWrapper: { marginBottom: 15 },
  scrollFilters: { height: 40 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 8, justifyContent:'center' },
  activeFilterTab: { backgroundColor: COLORS.primary || '#D32F2F' },
  filterText: { color: '#333', fontWeight: '600', fontSize: 13 },
  activeFilterText: { color: 'white' },

  cardWrapper: { marginBottom: 12, backgroundColor:'#fff', borderRadius:10, elevation:2, padding: 14, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4 },
  card:{ marginBottom: 8 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  itemTitle:{fontWeight:'700', fontSize: 16, color: '#333', flex:1, marginRight: 8},
  itemSub:{color:'#666',marginTop:4, fontSize: 12},
  statusBadge: { paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  statusText: { color:'white', fontSize:10, fontWeight:'bold', textTransform:'uppercase' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 5},
  btnSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6},
  btnTextSmall: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  operatorItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  operatorName: { fontSize: 16, color: '#333', fontWeight:'600' },
  operatorRole: { fontSize: 12, color: '#888' },
  closeModalBtn: { marginTop: 20, alignSelf: 'center', padding: 10 }
});