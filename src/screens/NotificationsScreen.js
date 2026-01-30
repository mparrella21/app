import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';

// Dati Mock per le notifiche
const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Ticket #104 Risolto', desc: 'Il tuo ticket "Buca via Roma" è stato risolto.', date: 'Oggi, 10:30', read: false, ticketId: 104 },
  { id: '2', title: 'Ticket #102 Preso in carico', desc: 'Un operatore ha preso in carico la segnalazione.', date: 'Ieri, 14:00', read: true, ticketId: 102 },
  { id: '3', title: 'Benvenuto!', desc: 'Grazie per esserti registrato a CivicManager.', date: '01/01/2024', read: true, ticketId: null },
];

export default function NotificationsScreen({ navigation }) {
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.read && styles.unreadCard]}
      onPress={() => item.ticketId && navigation.navigate('TicketDetail', { id: item.ticketId })}
    >
      <View style={styles.iconBox}>
        <Ionicons name="notifications" size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc}>{item.desc}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* HEADER CORRETTO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifiche</Text>
      </View>
      
      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  
  // HEADER STILE APP
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingTop: 50, // Spazio per la status bar
    paddingBottom: 15,
    backgroundColor: COLORS.primary, // BLU SCURO
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginLeft: 16, 
    color: 'white' // TESTO BIANCO
  },
  backBtn: {
    padding: 4
  },

  // CARD STYLES
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  unreadCard: { backgroundColor: '#EBF2FA', borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  desc: { color: '#666', fontSize: 13, marginTop: 2 },
  date: { color: '#999', fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent, marginLeft: 10 }
});