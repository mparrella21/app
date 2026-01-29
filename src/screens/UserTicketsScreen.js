import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Dati Mock (Simulano i ticket del cittadino loggato)
const MY_TICKETS = [
  { id: 1, title: 'Buca pericolosa', category: 'Strade', description: 'Via Roma dissestata', lat: 40.682, lon: 14.768, status: 'Aperto', author: 'Giuseppe Bianchi', date: '29/01/2026' },
  { id: 4, title: 'Segnaletica divelta', category: 'Segnaletica', description: 'Stop caduto a terra', lat: 40.680, lon: 14.772, status: 'Risolto', author: 'Giuseppe Bianchi', date: '15/01/2026' },
];

export default function UserTicketsScreen({ navigation }) {

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { ticket: item })}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{item.category}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.date}>Segnalato il {item.date}</Text>
      
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
        <Text style={styles.detailsLink}>Visualizza dettagli</Text>
        <Ionicons name="chevron-forward" size={16} color="#467599" />
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'Aperto': return '#D32F2F'; // Rosso
      case 'In Corso': return '#F59E0B'; // Arancio
      case 'Risolto': return '#4CAF50'; // Verde
      default: return '#999';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      
      {/* HEADER */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Le Mie Segnalazioni</Text>
            <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>

      {/* LISTA TICKET */}
      <FlatList
        data={MY_TICKETS}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Non hai ancora inviato segnalazioni.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#1F2937', paddingBottom: 15, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  listContent: { padding: 15 },
  
  card: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
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