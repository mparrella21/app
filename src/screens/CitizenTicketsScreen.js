import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { getUserTickets } from '../services/ticketService'; // Usa la funzione specifica per l'utente
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll } from '../services/mockTicketStore';
import { useAuth } from '../context/AuthContext';

export default function CitizenTicketsScreen({ navigation }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'closed'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (OFFLINE_MODE) {
          await initMock();
          const m = await getMockAll();
          // In offline mode filtriamo manualmente se necessario
          setTickets(m);
          return;
        }

        // Chiamata dinamica che recupera i ticket dell'utente
        if (user && user.id) {
            const t = await getUserTickets(user.id);
            setTickets(t);
        } else {
            // Fallback se l'utente non ha ID caricato
            setTickets([]);
        }

      } catch (e) {
          console.error("Errore caricamento ticket cittadino", e);
      } finally {
          setLoading(false);
      }
    };
    load();
  }, [user]);

  // Logica di filtro stato (Aperto vs Chiuso)
  const filtered = tickets.filter(t => {
    const status = (t.status || 'open').toLowerCase();
    const isClosed = status === 'risolto' || status === 'chiuso' || status === 'closed';
    
    if (filter === 'all') return true;
    if (filter === 'open') return !isClosed;
    if (filter === 'closed') return isClosed;
    return true;
  });

  if (loading) {
      return (
          <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Le tue segnalazioni</Text>

      <View style={{flexDirection:'row', marginBottom:12}}>
        <TouchableOpacity onPress={()=>setFilter('all')} style={[styles.filterBtn, filter==='all' && styles.filterActive]}><Text style={filter==='all'?styles.filterActiveText:styles.filterText}>Tutte</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setFilter('open')} style={[styles.filterBtn, filter==='open' && styles.filterActive]}><Text style={filter==='open'?styles.filterActiveText:styles.filterText}>Aperte</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setFilter('closed')} style={[styles.filterBtn, filter==='closed' && styles.filterActive]}><Text style={filter==='closed'?styles.filterActiveText:styles.filterText}>Chiuse</Text></TouchableOpacity>
      </View>

      <FlatList 
        data={filtered} 
        keyExtractor={i => String(i.id)} 
        renderItem={({item})=> (
        <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate('TicketDetail', { id: item.id })}>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            {item.images && item.images.length > 0 ? (
                <Image source={{uri:item.images[0]}} style={styles.thumb} />
            ) : (
                <View style={[styles.thumb, {backgroundColor:'#eee', justifyContent:'center', alignItems:'center'}]}>
                    <Text style={{fontSize:20}}>📄</Text>
                </View>
            )}
            
            <View style={{flex:1}}>
              <Text style={styles.itemTitle}>{item.titolo || item.title}</Text>
              <Text style={styles.itemSub}>
                  {new Date(item.creation_date || item.date || Date.now()).toLocaleDateString()} • {item.status || 'Aperto'}
              </Text>
            </View>
            
            {/* Indicatore visivo stato */}
            <View style={[styles.dot, {backgroundColor: (item.status === 'Risolto' || item.status === 'Chiuso') ? '#4CAF50' : '#FFC107'}]} />
          </View>
        </TouchableOpacity>
      )} 
      ListEmptyComponent={
          <View style={{alignItems:'center', marginTop:50}}>
              <Text style={{color:'#666'}}>Non hai ancora inviato segnalazioni.</Text>
          </View>
      } 
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:COLORS.bg},
  title:{fontSize:20,fontWeight:'800',color:COLORS.primary, marginBottom:12},
  card:{backgroundColor:'#fff',padding:12,borderRadius:12,marginBottom:10, elevation:1},
  thumb: {width:50,height:50,borderRadius:8,marginRight:12},
  itemTitle:{fontWeight:'700', fontSize:16, color:'#333'},
  itemSub:{color:'#666',marginTop:4, fontSize:12},
  filterBtn:{paddingVertical:6,paddingHorizontal:16,backgroundColor:'#e0e0e0',borderRadius:20,marginRight:8},
  filterActive:{backgroundColor:COLORS.primary},
  filterText:{color:'#333', fontWeight:'500'},
  filterActiveText:{color:'#fff',fontWeight:'700'},
  dot: {width:10, height:10, borderRadius:5, marginLeft:10}
});