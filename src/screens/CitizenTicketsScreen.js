import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getAllTickets } from '../services/ticketService';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll } from '../services/mockTicketStore';

export default function CitizenTicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      if (OFFLINE_MODE) {
        await initMock();
        const m = await getMockAll();
        setTickets(m);
        return;
      }
      const t = await getAllTickets();
      setTickets(t);
    };
    load();
  }, []);

  const filtered = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return (t.status || 'open') === 'open';
    if (filter === 'closed') return (t.status || '') === 'closed';
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Le tue segnalazioni</Text>

      <View style={{flexDirection:'row', marginBottom:12}}>
        <TouchableOpacity onPress={()=>setFilter('all')} style={[styles.filterBtn, filter==='all' && styles.filterActive]}><Text style={filter==='all'?styles.filterActiveText:styles.filterText}>Tutte</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setFilter('open')} style={[styles.filterBtn, filter==='open' && styles.filterActive]}><Text style={filter==='open'?styles.filterActiveText:styles.filterText}>Aperte</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setFilter('closed')} style={[styles.filterBtn, filter==='closed' && styles.filterActive]}><Text style={filter==='closed'?styles.filterActiveText:styles.filterText}>Chiuse</Text></TouchableOpacity>
      </View>

      <FlatList data={filtered} keyExtractor={i=>String(i.id)} renderItem={({item})=> (
        <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { id: item.id })}>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            {item.images && item.images.length>0 && <Image source={{uri:item.images[0]}} style={{width:64,height:48,borderRadius:6,marginRight:10}} />}
            <View style={{flex:1}}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>{item.creation_date || item.date} • {item.status || 'open'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )} ListEmptyComponent={<Text>Nessuna segnalazione</Text>} />
    </View>
  )
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary, marginBottom:12},
  card:{backgroundColor:'#fff',padding:12,borderRadius:8,marginBottom:8},
  itemTitle:{fontWeight:'700'},
  itemSub:{color:'#666',marginTop:4},
  filterBtn:{paddingVertical:6,paddingHorizontal:12,backgroundColor:'#fff',borderRadius:20,marginRight:8},
  filterActive:{backgroundColor:COLORS.primary},
  filterText:{color:'#333'},
  filterActiveText:{color:'#fff',fontWeight:'700'}
});