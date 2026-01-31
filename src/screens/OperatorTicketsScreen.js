import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Services
import { updateTicketStatus } from '../services/ticketService';
import { getMyInterventions } from '../services/interventionService'; // Usa Intervention Service per recuperare i task
import { COLORS } from '../styles/global';

export default function OperatorTicketsScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo'); // 'todo' (Da fare), 'working' (In corso), 'done' (Completati)

  const loadTasks = async () => {
    setLoading(true);
    try {
      // Recupera le assegnazioni dall'Intervention Service (rispetta architettura)
      const data = await getMyInterventions();
      
      // Mappiamo i dati se necessario. Assumiamo che l'API ritorni un array di oggetti 
      // che contengono sia i dati dell'assegnazione che i dettagli del ticket (o l'oggetto ticket annidato)
      // Se l'API intervention ritorna solo ID, bisognerebbe fare fetch dei dettagli. 
      // Assumiamo qui che ritorni oggetti "arricchiti" o compatibili.
      setTasks(data);
    } catch (e) {
      console.error("Errore caricamento task operatore:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  // Gestione "Prendi in Carico"
  const handleTakeCharge = async (ticket) => {
    Alert.alert(
      "Presa in carico",
      "Vuoi confermare l'inizio dei lavori per questo ticket?",
      [
        { text: "Annulla", style: "cancel" },
        { 
          text: "Conferma", 
          onPress: async () => {
            // Aggiorna stato su Ticket Service
            const success = await updateTicketStatus(ticket.id, 'In Corso', 2); // 2 = ID ipotetico stato "In Corso"
            if (success) {
              loadTasks();
              Alert.alert("Successo", "Ticket preso in carico.");
            } else {
              Alert.alert("Errore", "Impossibile aggiornare lo stato.");
            }
          }
        }
      ]
    );
  };

  // Gestione "Risolvi"
  const handleResolve = (ticket) => {
    // Naviga al dettaglio per compilare report o caricare foto prima di chiudere
    // Oppure gestione diretta qui se semplice
    navigation.navigate('TicketDetail', { ticket: ticket, mode: 'operator_resolve' });
  };

  // Filtro logico frontend
  const getFilteredTasks = () => {
    return tasks.filter(t => {
      // Normalizzazione stato
      const status = (t.status || t.ticket?.status || '').toLowerCase();
      
      if (filter === 'todo') {
        // Assegnato, Ricevuto, o Open (ma assegnato a me)
        return status === 'assegnato' || status === 'ricevuto' || status === 'open';
      }
      if (filter === 'working') {
        return status === 'in corso' || status === 'working' || status === 'in_progress';
      }
      if (filter === 'done') {
        return status === 'risolto' || status === 'chiuso' || status === 'closed';
      }
      return true;
    });
  };

  const renderItem = ({ item }) => {
    // Supporto struttura piatta o annidata (dipende dal backend intervention)
    const ticketData = item.ticket || item; 
    const status = (ticketData.status || '').toLowerCase();
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.categoryBadge}>{ticketData.category || 'Manutenzione'}</Text>
            <Text style={styles.date}>{new Date(ticketData.creation_date || Date.now()).toLocaleDateString()}</Text>
        </View>
        
        <Text style={styles.title}>{ticketData.title || ticketData.titolo}</Text>
        <Text style={styles.address} numberOfLines={1}>{ticketData.address || ticketData.indirizzo || 'Vedi mappa'}</Text>

        <View style={styles.actionRow}>
            <TouchableOpacity 
                style={styles.detailBtn} 
                onPress={() => navigation.navigate('TicketDetail', { ticket: ticketData })}
            >
                <Text style={styles.detailText}>Dettagli</Text>
            </TouchableOpacity>

            {/* Logica Bottoni Azione */}
            {(status === 'assegnato' || status === 'ricevuto' || status === 'open') && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleTakeCharge(ticketData)}>
                    <Text style={styles.btnText}>Prendi in Carico</Text>
                </TouchableOpacity>
            )}

            {(status === 'in corso' || status === 'working') && (
                <TouchableOpacity style={styles.successBtn} onPress={() => handleResolve(ticketData)}>
                    <Text style={styles.btnText}>Risolvi</Text>
                </TouchableOpacity>
            )}
            
            {(status === 'risolto' || status === 'chiuso') && (
                <View style={styles.completedLabel}>
                    <Ionicons name="checkmark-circle" size={20} color="green" />
                    <Text style={{color:'green', marginLeft:5, fontWeight:'bold'}}>Completato</Text>
                </View>
            )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Operatore</Text>
        <TouchableOpacity onPress={loadTasks}><Ionicons name="reload" size={24} color="white" /></TouchableOpacity>
      </SafeAreaView>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, filter==='todo' && styles.activeTab]} onPress={()=>setFilter('todo')}>
            <Text style={[styles.tabText, filter==='todo' && styles.activeTabText]}>Da Fare</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter==='working' && styles.activeTab]} onPress={()=>setFilter('working')}>
            <Text style={[styles.tabText, filter==='working' && styles.activeTabText]}>In Corso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter==='done' && styles.activeTab]} onPress={()=>setFilter('done')}>
            <Text style={[styles.tabText, filter==='done' && styles.activeTabText]}>Storico</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop:20}} size="large" color={COLORS.primary} />
      ) : (
        <FlatList 
            data={getFilteredTasks()} 
            keyExtractor={i => String(i.id || Math.random())} 
            renderItem={renderItem}
            contentContainerStyle={{padding: 16}}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTasks}/>}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 50}}>
                    <Ionicons name="file-tray-outline" size={50} color="#ccc"/>
                    <Text style={{color:'#888', marginTop:10}}>Nessun incarico in questa sezione.</Text>
                </View>
            }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#1F2937', padding: 20, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },

  card: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: { fontSize: 10, backgroundColor: '#E0F2F1', color: '#00695C', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight:'bold', textTransform:'uppercase' },
  date: { fontSize: 12, color: '#999' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  address: { fontSize: 13, color: '#666', marginBottom: 15 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  detailBtn: { padding: 8 },
  detailText: { color: '#666' },
  primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  successBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  btnText: { color: 'white', fontWeight: 'bold' },
  completedLabel: { flexDirection: 'row', alignItems: 'center' }
});