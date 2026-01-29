import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dati finti per vedere l'effetto grafico
const MY_TICKETS = [
  { id: '1', title: 'Lampione guasto', date: '29/01/2026', status: 'Aperto', color: '#ef4444' }, 
  { id: '2', title: 'Rifiuti abbandonati', date: '20/01/2026', status: 'Risolto', color: '#22c55e' },
  { id: '3', title: 'Buca pericolosa', date: '15/01/2026', status: 'In Corso', color: '#eab308' },
];

const UserDashboardScreen = ({ navigation }) => {
  
  const renderTicket = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
           <Ionicons name="document-text" size={20} color="#1D2D44" style={{marginRight:8}}/>
           <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: item.color }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardDate}>Segnalato il: {item.date}</Text>
      
      <View style={styles.divider}/>
      
      <TouchableOpacity style={styles.detailsBtn} onPress={() => alert("Dettaglio non ancora implementato")}>
        <Text style={styles.btnText}>Visualizza</Text>
        <Ionicons name="chevron-forward" size={16} color="#1D2D44" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D2D44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Area Personale</Text>
        <View style={{width: 24}} /> 
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Le mie segnalazioni</Text>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D2D44' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 15 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  cardDate: { fontSize: 12, color: '#6B7280', marginBottom: 10, marginLeft: 28 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  btnText: { color: '#1D2D44', fontWeight: '600', fontSize: 14, marginRight: 5 }
});

export default UserDashboardScreen;