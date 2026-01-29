import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dati finti per vedere l'effetto identico al sito
const MY_TICKETS = [
  { id: '1', title: 'Lampione rotto', date: '29/01/2026', status: 'Aperto', color: '#dc2626' }, // Rosso
  { id: '2', title: 'Rifiuti abbandonati', date: '20/01/2026', status: 'Risolto', color: '#16a34a' }, // Verde
  { id: '3', title: 'Buca stradale', date: '15/01/2026', status: 'In Lavorazione', color: '#ca8a04' }, // Giallo
];

const UserDashboardScreen = ({ navigation }) => {
  
  const renderTicket = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: item.color }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardDate}>Segnalato il: {item.date}</Text>
      <TouchableOpacity style={styles.detailsBtn}>
        <Text style={styles.btnText}>Visualizza Dettagli</Text>
        <Ionicons name="chevron-forward" size={16} color="#1D2D44" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Semplice */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D2D44" />
        </TouchableOpacity>
        <Text style={styles.title}>Area Personale</Text>
        <View style={{width: 24}} /> 
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Le tue segnalazioni</Text>
        <FlatList 
          data={MY_TICKETS}
          keyExtractor={item => item.id}
          renderItem={renderTicket}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', elevation: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1D2D44' },
  content: { flex: 1, padding: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 15 },
  
  // Card Stile Sito
  card: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1D2D44' },
  cardDate: { fontSize: 12, color: '#6B7280', marginBottom: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  btnText: { color: '#1D2D44', fontWeight: '600', fontSize: 14, marginRight: 5 }
});

export default UserDashboardScreen;