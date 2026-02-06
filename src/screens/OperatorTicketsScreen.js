import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { updateTicketStatus, getAllTickets } from '../services/ticketService';
import { getAssignments } from '../services/interventionService'; 
import { COLORS } from '../styles/global';
import { useAuth } from '../context/AuthContext';

export default function OperatorTicketsScreen({ navigation }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo'); 

  const loadTasks = async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    try {
      // 1. Assegnamenti
      const assignments = await getAssignments(user.tenant_id);
      const myTicketIds = assignments.filter(a => String(a.id_user) === String(user.id)).map(a => a.id_ticket);

      // 2. Ticket del tenant
      const allTenantTickets = await getAllTickets(user.tenant_id);
      
      // 3. Filtro
      const myFullTickets = allTenantTickets.filter(ticket => myTicketIds.includes(ticket.id));
      setTasks(myFullTickets);

    } catch (e) {
      console.error("Errore caricamento task operatore:", e);
      Alert.alert("Errore", "Impossibile caricare i ticket assegnati.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [user])
  );

  // Gestione "Prendi in Carico"
  const handleTakeCharge = async (ticketData) => {
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
                // LOGICA CORRETTA: Passiamo user.id e stato 2 (In Lavorazione)
                const success = await updateTicketStatus(ticketData.id, user.tenant_id, user.id, 2);
                
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

  const handleResolve = (ticketData) => {
    // La risoluzione richiede un rapporto, quindi mandiamo al dettaglio
    navigation.navigate('TicketDetail', { id: ticketData.id, ticket: ticketData, tenant_id: user.tenant_id });
  };

  const getFilteredTasks = () => {
    return tasks.filter(ticket => {
      const ticketStatus = (ticket.status || '').toLowerCase();
      const statusId = ticket.id_status;
      
      if (filter === 'todo') {
        return statusId === 1 || ticketStatus === 'assegnato' || ticketStatus === 'ricevuto' || ticketStatus === 'open' || ticketStatus === 'aperto';
      }
      if (filter === 'working') {
        return statusId === 2 || ticketStatus === 'in lavorazione' || ticketStatus === 'in corso' || ticketStatus === 'working';
      }
      if (filter === 'done') {
        return statusId === 3 || statusId === 4 || ticketStatus === 'risolto' || ticketStatus === 'chiuso' || ticketStatus === 'closed';
      }
      return true;
    });
  };

  const renderItem = ({ item }) => {
    const ticketData = item;
    if (!ticketData) return null;
    const catLabel = (ticketData.categories && ticketData.categories.length > 0 && typeof ticketData.categories[0] === 'object') 
        ? ticketData.categories[0].label 
        : 'Generico';
    const locationDisplay = ticketData.location 
        ? ticketData.location 
        : (ticketData.lat && ticketData.lon 
            ? `${parseFloat(ticketData.lat).toFixed(5)}, ${parseFloat(ticketData.lon).toFixed(5)}` 
            : 'Posizione non disponibile');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.categoryBadge}>{catLabel}</Text>
            <Text style={styles.date}>{ticketData.creation_date ? new Date(ticketData.creation_date).toLocaleDateString() : 'Data N/D'}</Text>
        </View>
        <Text style={styles.title}>{ticketData.title || 'Senza Titolo'}</Text>
        <Text style={styles.address} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} /> {locationDisplay}
        </Text>

        <View style={styles.actionRow}>
            <TouchableOpacity 
                style={styles.detailBtn} 
                onPress={() => navigation.navigate('TicketDetail', { id: ticketData.id, ticket: ticketData, tenant_id: user.tenant_id })}
            >
                <Text style={styles.detailText}>Dettagli</Text>
            </TouchableOpacity>

            {filter === 'todo' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleTakeCharge(ticketData)}>
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
        {/* AGGIUNTO: Tasto Indietro */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 10}}>
             <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dashboard Operatore</Text>
        
        <TouchableOpacity onPress={loadTasks}>
            <Ionicons name="reload" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

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
            keyExtractor={(item, index) => String(item.id || index)} 
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
  // Modificato per allineare gli elementi (freccia - titolo - reload)
  header: { 
      backgroundColor: '#1F2937', 
      padding: 20, 
      flexDirection:'row', 
      alignItems:'center',
      justifyContent: 'space-between'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
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