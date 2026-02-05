import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';

// IMPORT SERVIZI
import { getAllTickets, closeTicket, getCategories } from '../services/ticketService';
import { getOperatorsByTenant } from '../services/userService'; 
import { createAssignment } from '../services/interventionService';
import { AuthContext } from '../context/AuthContext';
import EmptyState from '../component/EmptyState';

export default function ResponsibleTicketsScreen({ navigation }) {
  const { user } = useContext(AuthContext); 

  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  
  // Filtri
  const [filterStatus, setFilterStatus] = useState('Tutti'); 
  const [filterCategory, setFilterCategory] = useState('Tutte');
  const [filterTime, setFilterTime] = useState('Tutto');
  
  // Dati di supporto
  const [operators, setOperators] = useState([]);
  const [categories, setCategories] = useState(['Tutte']);
  const [loading, setLoading] = useState(true);
  
  // Statistiche
  const [stats, setStats] = useState({ 
      total: 0, 
      open: 0, 
      closed: 0, 
      avgResolutionDays: 0
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.tenant_id) {
          // 1. Carica Ticket
          let t = await getAllTickets(user.tenant_id);
          // Assicuriamoci che t sia un array
          t = Array.isArray(t) ? t : [];
          setAllTickets(t);
          calculateStats(t); 
          
          // 2. Carica Operatori
          const ops = await getOperatorsByTenant(user.tenant_id);
          setOperators(Array.isArray(ops) ? ops : []);

          // 3. Carica Categorie
          const cats = await getCategories();
          const safeCats = Array.isArray(cats) ? cats : [];
          const catList = safeCats.map(c => (typeof c === 'object' ? c.label : c));
          setCategories(['Tutte', ...catList]);
      }
    } catch (e) {
      console.error("Errore caricamento responsabile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const calculateStats = (tickets) => {
      const total = tickets.length;
      const open = tickets.filter(t => t.id_status === 1 || t.id_status === 2).length;
      const closedTickets = tickets.filter(t => t.id_status === 3 || t.id_status === 4);
      const closed = closedTickets.length;

      let totalResolutionTime = 0;
      let countWithDates = 0;

      closedTickets.forEach(t => {
          const start = new Date(t.created_at || t.timestamp);
          const end = t.updated_at ? new Date(t.updated_at) : new Date();
          
          if (!isNaN(start) && !isNaN(end) && end > start) {
              const diffTime = Math.abs(end - start);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              totalResolutionTime += diffDays;
              countWithDates++;
          }
      });

      const avgResolutionDays = countWithDates > 0 ? (totalResolutionTime / countWithDates).toFixed(1) : 0;
      setStats({ total, open, closed, avgResolutionDays });
  };

  // Logica di Filtro
  useEffect(() => {
    let result = allTickets;

    if (filterStatus !== 'Tutti') {
      result = result.filter(t => {
         if (filterStatus === 'Aperti') return t.id_status === 1;
         if (filterStatus === 'In Corso') return t.id_status === 2;
         if (filterStatus === 'Risolti') return t.id_status === 3 || t.id_status === 4;
         return true;
      });
    }

    if (filterCategory !== 'Tutte') {
      result = result.filter(t => {
         const catName = (t.categories && t.categories.length > 0) ? t.categories[0].label : 'Generico';
         return catName.toLowerCase() === filterCategory.toLowerCase();
      });
    }

    if (filterTime !== 'Tutto') {
        const now = new Date();
        result = result.filter(t => {
            const tDate = new Date(t.created_at || t.timestamp);
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
      if (!selectedTicket || !user?.tenant_id) return;
      const success = await createAssignment(selectedTicket.id, operatorId, user.tenant_id);
      if (success) {
          Alert.alert("Successo", "Intervento assegnato!");
          setModalVisible(false);
          loadData();
      } else {
          Alert.alert("Errore", "Assegnazione fallita.");
      }
  };

  const handleClose = async (id) => {
    const ok = await closeTicket(id, user.tenant_id);
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Gestione Ticket</Text>
          <TouchableOpacity onPress={loadData} style={{padding: 5}}>
            <Ionicons name="reload" size={24} color={COLORS?.primary || '#000'} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Statistiche */}
        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Totali</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
                <Text style={[styles.statNumber, {color: COLORS?.primary || '#000'}]}>{stats.open}</Text>
                <Text style={styles.statLabel}>Aperti</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
                <Text style={[styles.statNumber, {color: 'green'}]}>{stats.closed}</Text>
                <Text style={styles.statLabel}>Risolti</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={[styles.statNumber, {color: '#F59E0B'}]}>{stats.avgResolutionDays}g</Text>
                <Text style={styles.statLabel}>T. Medio</Text>
            </View>
        </View>
        
        {/* Filtri */}
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.scrollFilters, {marginTop: 8}]}>
            {['Tutto', 'Oggi', 'Settimana', 'Mese'].map((t, index) => (
               <FilterTab key={index} label={t} selected={filterTime} onSelect={setFilterTime} />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS?.primary || '#000'} style={{marginTop: 20}} />
        ) : (
          <FlatList 
              data={filteredTickets} 
              keyExtractor={i => String(i.id)} 
              contentContainerStyle={{paddingBottom: 20}}
              style={{flex: 1}} // Importante per la visualizzazione corretta
              renderItem={({item}) => {
                  const statusText = item.id_status === 1 ? 'APERTO' : item.id_status === 2 ? 'IN CORSO' : 'RISOLTO';
                  const catName = (item.categories && item.categories.length > 0) ? item.categories[0].label : 'Generico';

                  return (
                      <View style={styles.cardWrapper}>
                          <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { id: item.id })}>
                          <View style={styles.cardHeader}>
                              <Text style={styles.itemTitle}>{item.title}</Text>
                              <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.id_status)}]}>
                              <Text style={styles.statusText}>{statusText}</Text>
                              </View>
                          </View>
                          <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 4}}>
                              <Text style={styles.itemSub}>{new Date(item.created_at).toLocaleDateString()}</Text>
                              <Text style={[styles.itemSub, {fontWeight:'bold', color: COLORS?.primary || '#000'}]}>
                                  {catName}
                              </Text>
                          </View>
                          <Text style={styles.itemSub}>{item.creator_id || 'Cittadino'}</Text>
                          </TouchableOpacity>
                          
                          <View style={styles.actionRow}>
                              {item.id_status === 1 && (
                                  <TouchableOpacity style={[styles.btnSmall, {backgroundColor: '#007BFF', marginRight: 8}]} onPress={() => openAssignModal(item)}>
                                      <Text style={styles.btnTextSmall}>Assegna</Text>
                                  </TouchableOpacity>
                              )}
                              
                              {item.id_status !== 3 && item.id_status !== 4 && (
                              <TouchableOpacity style={[styles.btnSmall, {backgroundColor: COLORS?.primary || '#000'}]} onPress={() => handleClose(item.id)}>
                                  <Text style={styles.btnTextSmall}>Chiudi</Text>
                              </TouchableOpacity>
                              )}
                          </View>
                      </View>
                  );
              }} 
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
                              <Ionicons name="person-circle-outline" size={36} color={COLORS?.primary || '#000'} />
                              <View style={{marginLeft: 12}}>
                                  <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
                                  <Text style={styles.operatorRole}>Operatore</Text>
                                  <Text style={styles.operatorCat}>{item.category || 'Generico'}</Text>
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
    </SafeAreaView>
  )
}

const getStatusColor = (statusId) => {
  if(statusId === 3 || statusId === 4) return '#4CAF50'; 
  if(statusId === 2) return '#F59E0B'; 
  return '#D32F2F'; 
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS?.bg || '#f5f5f5' },
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    // CORREZIONE: Gestione sicura di StatusBar.currentHeight per evitare NaN su iOS
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
    paddingBottom: 16 
  },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12, marginTop: 10},
  title: { fontSize: 20, fontWeight:'800', color: COLORS?.primary || '#D32F2F' },
  
  statsContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 15, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center', justifyContent:'center' },
  statBorder: { borderRightWidth:1, borderColor:'#eee' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', textAlign:'center', marginTop:2 },

  filtersWrapper: { marginBottom: 15 },
  scrollFilters: { height: 40 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 8, justifyContent:'center' },
  activeFilterTab: { backgroundColor: COLORS?.primary || '#D32F2F' },
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
  operatorCat: { fontSize: 11, color: '#007BFF', fontStyle:'italic' },
  closeModalBtn: { marginTop: 20, alignSelf: 'center', padding: 10 }
});