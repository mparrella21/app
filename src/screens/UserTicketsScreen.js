import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; 
import { getUserTickets } from '../services/ticketService'; 

export default function UserTicketsScreen({ navigation }) {
  const { user } = useAuth(); 
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Chiama il servizio filtrato per utente (Corretto per Requisito IF-2.4)
      const tickets = await getUserTickets(user.id);
      setMyTickets(tickets);
    } catch (error) {
      console.error("Errore caricamento ticket personali:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTickets();
    });
    return unsubscribe;
  }, [navigation, user]);

  const getStatusColor = (status) => {
    const s = status ? String(status).toLowerCase() : '';
    if (s === 'aperto' || s === 'open') return '#D32F2F'; 
    if (s === 'in corso' || s === 'in_progress' || s === 'assegnato') return '#F59E0B'; 
    if (s === 'risolto' || s === 'resolved' || s === 'chiuso') return '#4CAF50'; 
    return '#999';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { id: item.id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{item.category || item.categoria || 'Generico'}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status || item.stato) }]}>
          <Text style={styles.badgeText}>{(item.status || item.stato || 'Aperto').toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.title || item.titolo}</Text>
      <Text style={styles.date}>
        Segnalato il {item.date ? new Date(item.date).toLocaleDateString() : (item.creation_date || 'N/D')}
      </Text>
      
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
        <Text style={styles.detailsLink}>Visualizza dettagli</Text>
        <Ionicons name="chevron-forward" size={16} color="#467599" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Le Mie Segnalazioni</Text>
            <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#467599" />
            <Text style={{marginTop:10, color:'#666'}}>Caricamento...</Text>
        </View>
      ) : (
        <FlatList
          data={myTickets}
          renderItem={renderItem}
          keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadTickets}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>Non hai ancora inviato segnalazioni.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#1F2937', paddingBottom: 15, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  listContent: { padding: 15 },
  
  // Ripristinate le ombreggiature più ricche per iOS (shadow*)
  card: { 
      backgroundColor: 'white', 
      borderRadius: 10, 
      padding: 15, 
      marginBottom: 15, 
      elevation: 2, 
      shadowColor: '#000', 
      shadowOpacity: 0.1, 
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  category: { fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  date: { fontSize: 12, color: '#999' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsLink: { color: '#467599', fontWeight: 'bold', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10 }
});