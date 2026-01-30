import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { getAllTickets, closeTicket } from '../services/ticketService';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll, closeTicket as mockClose } from '../services/mockTicketStore';
import EmptyState from '../component/EmptyState'; // Importa EmptyState

export default function ResponsibleTicketsScreen({ navigation }) {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Tutti'); // Stato filtro: Tutti, Aperto, In Corso, Risolto

  const loadTickets = async () => {
    let t = [];
    if (OFFLINE_MODE) {
      await initMock();
      t = await getMockAll();
    } else {
      t = await getAllTickets();
    }
    setAllTickets(t);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Effetto per applicare il filtro quando cambia lo stato o i ticket
  useEffect(() => {
    if (filterStatus === 'Tutti') {
      setFilteredTickets(allTickets);
    } else {
      setFilteredTickets(allTickets.filter(t => t.status === filterStatus));
    }
  }, [filterStatus, allTickets]);

  const handleClose = async (id) => {
    let ok = false;
    if (OFFLINE_MODE) ok = await mockClose(id);
    else ok = await closeTicket(id);

    if (ok) {
      await loadTickets(); // Ricarica e riapplica filtri
      alert('Ticket chiuso con successo');
    } else {
      alert('Errore nella chiusura');
    }
  };

  // Componente per i tab dei filtri
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
      <Text style={styles.title}>Gestione Ticket (Responsabile)</Text>
      
      {/* BARRA DEI FILTRI */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterTab label="Tutti" value="Tutti" />
          <FilterTab label="Aperti" value="Aperto" />
          <FilterTab label="In Corso" value="In Corso" />
          <FilterTab label="Risolti" value="Risolto" />
        </ScrollView>
      </View>

      <FlatList 
        data={filteredTickets} 
        keyExtractor={i => String(i.id)} 
        renderItem={({item}) => (
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { ticket: item })}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
                   <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>{item.creation_date || item.date} - {item.author || 'Cittadino'}</Text>
            </TouchableOpacity>
            
            {item.status !== 'Risolto' && (
              <TouchableOpacity style={styles.closeBtn} onPress={() => handleClose(item.id)}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>Chiudi</Text>
              </TouchableOpacity>
            )}
          </View>
        )} 
        ListEmptyComponent={<EmptyState text="Nessun ticket per questo filtro" />} 
      />
    </View>
  )
}

const getStatusColor = (s) => {
  if(s==='Risolto') return '#4CAF50';
  if(s==='In Corso') return '#F59E0B';
  return '#D32F2F';
};

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary, marginBottom:12},
  
  // Stili Filtri
  filterContainer: { flexDirection: 'row', marginBottom: 15, height: 40 },
  filterTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 10 },
  activeFilterTab: { backgroundColor: COLORS.primary },
  filterText: { color: '#333', fontWeight: '600' },
  activeFilterText: { color: 'white' },

  cardRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  card:{backgroundColor:'#fff',padding:12,borderRadius:8,flex:1,marginRight:8, elevation: 2},
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  itemTitle:{fontWeight:'700', fontSize: 16, color: '#333'},
  itemSub:{color:'#666',marginTop:4, fontSize: 12},
  
  statusBadge: { paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  statusText: { color:'white', fontSize:10, fontWeight:'bold' },

  closeBtn:{backgroundColor:COLORS.primary,padding:12,borderRadius:8, justifyContent:'center'}
});