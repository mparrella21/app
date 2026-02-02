import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Services
import { updateTicketStatus } from '../services/ticketService';
import { getAssignments } from '../services/interventionService'; 
import { COLORS } from '../styles/global';

export default function OperatorTicketsScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo'); // 'todo', 'working', 'done'

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getAssignments();
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
  const handleTakeCharge = async (item) => {
    // Estraiamo l'ID del ticket (adattabile a seconda se item è l'assegnazione o il ticket stesso)
    const ticketData = item.ticket ? item.ticket : item;
    const ticketId = ticketData.id || ticketData.id_ticket; 

    Alert.alert(
      "Presa in carico",
      "Vuoi confermare l'inizio dei lavori per questo ticket?",
      [
        { text: "Annulla", style: "cancel" },
        { 
          text: "Conferma", 
          onPress: async () => {
            setLoading(true);
            try {
                // Per prendere in carico, basta aggiornare lo stato del TICKET a 2 ("In Lavorazione")
                const success = await updateTicketStatus(ticketId, 'In Lavorazione', 2);
                
                if (success) {
                    Alert.alert("Successo", "Ticket preso in carico correttamente.");
                    loadTasks(); 
                } else {
                    Alert.alert("Errore", "Impossibile aggiornare lo stato del ticket. Riprova.");
                    loadTasks();
                }
            } catch (error) {
                console.error(error);
                Alert.alert("Errore", "Si è verificato un problema durante l'operazione.");
            } finally {
                setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Gestione "Risolvi"
  const handleResolve = (ticketData) => {
    // Passiamo i dati del ticket alla schermata di dettaglio per la chiusura (aggiunta foto e rapporto intervento)
    navigation.navigate('TicketDetail', { ticket: ticketData });
  };

  // Filtro logico frontend
  const getFilteredTasks = () => {
    return tasks.filter(item => {
      // Normalizzazione: supporta sia struttura piatta che annidata
      const ticketStatus = (item.ticket?.status || item.status || '').toLowerCase();
      const statusId = item.ticket?.id_status || item.id_status;
      
      if (filter === 'todo') {
        // Ticket assegnati ma non ancora in lavorazione (Stato 1)
        return statusId === 1 || ticketStatus === 'assegnato' || ticketStatus === 'ricevuto' || ticketStatus === 'open' || ticketStatus === 'aperto';
      }
      if (filter === 'working') {
        // Ticket in corso (Stato 2)
        return statusId === 2 || ticketStatus === 'in lavorazione' || ticketStatus === 'in corso' || ticketStatus === 'working' || ticketStatus === 'in_progress';
      }
      if (filter === 'done') {
        // Ticket risolti o chiusi (Stato 3 o 4)
        return statusId === 3 || statusId === 4 || ticketStatus === 'risolto' || ticketStatus === 'chiuso' || ticketStatus === 'closed';
      }
      return true;
    });
  };

  const renderItem = ({ item }) => {
    // Estrazione dati ticket dall'oggetto assegnazione o dal ticket stesso
    const ticketData = item.ticket ? item.ticket : item; 
    
    if (!ticketData) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.categoryBadge}>
                {Array.isArray(ticketData.categories) && ticketData.categories.length > 0 
                    ? ticketData.categories[0].label 
                    : (ticketData.category || 'Generico')}
            </Text>
            <Text style={styles.date}>{ticketData.creation_date ? new Date(ticketData.creation_date).toLocaleDateString() : 'Data N/D'}</Text>
        </View>
        
        <Text style={styles.title}>{ticketData.titolo || ticketData.title || 'Senza Titolo'}</Text>
        <Text style={styles.address} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} /> {ticketData.indirizzo || ticketData.address || 'Posizione non disponibile'}
        </Text>

        <View style={styles.actionRow}>
            <TouchableOpacity 
                style={styles.detailBtn} 
                onPress={() => navigation.navigate('TicketDetail', { id: ticketData.id, ticket: ticketData })}
            >
                <Text style={styles.detailText}>Dettagli</Text>
            </TouchableOpacity>

            {/* Logica Bottoni Azione */}
            {filter === 'todo' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleTakeCharge(item)}>
                    <Text style={styles.btnText}>Prendi in Carico</Text>
                </TouchableOpacity>
            )}

            {filter === 'working' && (
                <TouchableOpacity style={styles.successBtn} onPress={() => handleResolve(ticketData)}>
                    <Text style={styles.btnText}>Risolvi</Text>
                </TouchableOpacity>
            )}
            
            {filter === 'done' && (
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
            keyExtractor={(item, index) => String(item.id || item.id_ticket || index)} 
            renderItem={renderItem}
            contentContainerStyle={{padding: 16, paddingBottom: 100}}
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
  categoryBadge: { fontSize: 10, backgroundColor: '#E0F2F1', color: '#00695C', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight:'bold', textTransform:'uppercase', overflow: 'hidden' },
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