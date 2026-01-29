import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTickets } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll } from '../services/mockTicketStore';

const COLORS = { primary: '#0077B6', bg: '#F3F4F6', card: '#FFF' };

const CitizenHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (OFFLINE_MODE) {
          await initMock();
          const m = await getMockAll();
          setTickets(m);
        } else {
          const t = await getAllTickets();
          setTickets(t);
        }
      } catch (e) {
        console.warn('CitizenHomeScreen.load', e);
      }
      setLoading(false);
    };

    load();
  }, []);

  const renderTicket = ({ item }) => (
    <View style={styles.ticketCard}>
      <View style={styles.iconContainer}>
        <Ionicons name="construct" size={24} color="#555" />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.ticketTitle}>{item.title}</Text>
        <Text style={styles.ticketSub}>Ticket #{item.id} • {item.creation_date || item.date || ''}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: '#00000010' }]}>
        <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 10 }}>{item.status || '—'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Ciao, {user?.name || 'utente'}! 👋</Text>
          <Text style={styles.subText}>{user?.role || 'Cittadino'}</Text>
        </View>
        <View style={styles.avatar}><Text style={{color: COLORS.primary, fontWeight:'800'}}>{(user?.name || 'U').charAt(0)}</Text></View>
      </View>

      <View style={styles.body}>
        {/* Tab Switcher (Finto per ora) */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={styles.activeTabText}>ATTIVI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>STORICO</Text>
          </TouchableOpacity>
        </View>

        {/* Lista Ticket */}
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={item => String(item.id)}
            renderItem={renderTicket}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={<Text style={styles.listTitle}>Le tue segnalazioni</Text>}
          />
        )}
      </View>

      {/* FAB (Floating Action Button) per Nuova Segnalazione */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Map')}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 56,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  welcomeText: { color: 'white', fontSize: 20, fontWeight: '800' },
  subText: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.light, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: 20 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 10, padding: 5, marginBottom: 20 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: 'white', elevation: 2 }, // O un colore leggero
  activeTabText: { fontWeight: 'bold', color: COLORS.primary },
  tabText: { color: '#999' },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  ticketCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  ticketTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  ticketSub: { color: '#888', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D32F2F', // Rosso come nel video
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 }
  }
});

export default CitizenHomeScreen;