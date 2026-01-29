import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { getAllTickets, closeTicket } from '../services/ticketService';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll, closeTicket as mockClose } from '../services/mockTicketStore';

export default function ResponsibleTicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);

  const loadTickets = async () => {
    if (OFFLINE_MODE) {
      await initMock();
      const m = await getMockAll();
      setTickets(m);
      return;
    }
    const t = await getAllTickets();
    setTickets(t);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleClose = async (id) => {
    let ok = false;
    if (OFFLINE_MODE) ok = await mockClose(id);
    else ok = await closeTicket(id);

    if (ok) {
      await loadTickets();
      alert('Ticket chiuso con successo');
    } else {
      alert('Errore nella chiusura');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestione (Responsabili)</Text>
      <FlatList data={tickets} keyExtractor={i=>String(i.id)} renderItem={({item})=> (
        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { id: item.id })}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSub}>{item.creation_date || item.date}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => handleClose(item.id)}>
            <Text style={{color:'#fff'}}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      )} ListEmptyComponent={<Text>Nessun ticket</Text>} />
    </View>
  )
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary, marginBottom:12},
  cardRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  card:{backgroundColor:'#fff',padding:12,borderRadius:8,flex:1,marginRight:8},
  itemTitle:{fontWeight:'700'},
  itemSub:{color:'#666',marginTop:4},
  closeBtn:{backgroundColor:COLORS.primary,padding:10,borderRadius:8}
});