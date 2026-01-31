import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTickets, closeTicket } from '../services/ticketService';
import { getOperators } from '../services/userService'; 
import { assignTicketToOperator } from '../services/interventionService';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import EmptyState from '../component/EmptyState';

export default function ResponsibleTicketsScreen({ navigation }) {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Tutti'); 
  const [operators, setOperators] = useState([]);
  
  // Stati Modale Assegnazione
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadData = async () => {
    // 1. Carica Ticket
    let t = await getAllTickets();
    setAllTickets(t);
    // 2. Carica Operatori (per l'assegnazione)
    if (!OFFLINE_MODE) {
        const ops = await getOperators();
        setOperators(ops);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtro
  useEffect(() => {
    if (filterStatus === 'Tutti') {
      setFilteredTickets(allTickets);
    } else {
      // Nota: Verifica se il backend ritorna 'OPEN' o 'Aperto'. Qui adatto il filtro.
      // Se il backend usa 'OPEN', mappiamo il filtro 'Aperti' su 'OPEN'
      let targetStatus = filterStatus;
      if (filterStatus === 'Aperti') targetStatus = 'OPEN';
      
      setFilteredTickets(allTickets.filter(t => t.status === targetStatus || t.status === filterStatus));
    }
  }, [filterStatus, allTickets]);

  // Gestione Assegnazione
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
          loadData(); // Ricarica stato
      } else {
          Alert.alert("Errore", "Assegnazione fallita.");
      }
  };

  const handleClose = async (id) => {
    const ok = await closeTicket(id);
    if (ok) {
      loadData();
      alert('Ticket chiuso con successo');
    } else {
      alert('Errore nella chiusura');
    }
  };

  const FilterTab = ({ label, value }) => (
    <TouchableOpacity 
      style={[styles.filterTab, filterStatus === value && styles.activeFilterTab]} 
      onPress={() => setFilterStatus(value)}
    >
      <Text style={[styles.filterText, filterStatus === value && styles.activeFilterText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestione Ticket</Text>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterTab label="Tutti" value="Tutti" />
          <FilterTab label="Aperti" value="Aperti" /> 
          <FilterTab label="In Corso" value="In Corso" />
          <FilterTab label="Risolti" value="Risolto" />
        </ScrollView>
      </View>

      <FlatList 
        data={filteredTickets} 
        keyExtractor={i => String(i.id)} 
        renderItem={({item}) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { ticketId: item.id })}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
                   <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>{item.creation_date || item.timestamp} - {item.author || 'Cittadino'}</Text>
            </TouchableOpacity>
            
            <View style={styles.actionRow}>
                {/* Tasto Assegna solo se è Aperti/OPEN */}
                {(item.status === 'OPEN' || item.status === 'Ricevuto') && (
                    <TouchableOpacity style={[styles.btnSmall, {backgroundColor: '#007BFF', marginRight: 8}]} onPress={() => openAssignModal(item)}>
                        <Text style={styles.btnTextSmall}>Assegna</Text>
                    </TouchableOpacity>
                )}
                
                {item.status !== 'Risolto' && (
                  <TouchableOpacity style={[styles.btnSmall, {backgroundColor: COLORS.primary}]} onPress={() => handleClose(item.id)}>
                    <Text style={styles.btnTextSmall}>Chiudi</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        )} 
        ListEmptyComponent={<EmptyState text="Nessun ticket per questo filtro" />} 
      />

      {/* MODAL ASSEGNAZIONE */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Assegna Ticket</Text>
                <Text style={{marginBottom:10, color:'#666'}}>A chi vuoi assegnare "{selectedTicket?.title}"?</Text>
                
                <FlatList
                    data={operators}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.operatorItem} onPress={() => handleAssign(item.id)}>
                            <Ionicons name="person-circle-outline" size={32} color="#555" />
                            <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
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
  if(s==='Risolto') return '#4CAF50';
  if(s==='In Corso') return '#F59E0B';
  return '#D32F2F';
};

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg || '#f5f5f5'},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary || '#D32F2F', marginBottom:12},
  
  filterContainer: { flexDirection: 'row', marginBottom: 15, height: 40 },
  filterTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 10 },
  activeFilterTab: { backgroundColor: COLORS.primary || '#D32F2F' },
  filterText: { color: '#333', fontWeight: '600' },
  activeFilterText: { color: 'white' },

  cardWrapper: { marginBottom: 10, backgroundColor:'#fff', borderRadius:8, elevation:2, padding: 12 },
  card:{ marginBottom: 8 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  itemTitle:{fontWeight:'700', fontSize: 16, color: '#333'},
  itemSub:{color:'#666',marginTop:4, fontSize: 12},
  statusBadge: { paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  statusText: { color:'white', fontSize:10, fontWeight:'bold' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8},
  btnSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6},
  btnTextSmall: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  operatorItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  operatorName: { marginLeft: 10, fontSize: 16, color: '#333' },
  closeModalBtn: { marginTop: 15, alignSelf: 'center', padding: 10 }
});