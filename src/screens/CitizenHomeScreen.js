import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTickets } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll as getMockAll } from '../services/mockTicketStore';

const COLORS = { primary: '#0077B6', bg: '#F3F4F6', card: '#FFF', accent: '#C06E52' };

const CitizenHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' o 'history'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data = [];
        if (OFFLINE_MODE) {
          await initMock();
          data = await getMockAll();
        } else {
          data = await getAllTickets();
        }
        setTickets(data);
      } catch (e) {
        console.warn('CitizenHomeScreen.load', e);
      }
      setLoading(false);
    };

    // Ricarica ogni volta che la screen prende il focus (per aggiornamenti nuovi ticket)
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  // FILTRO LISTA: Attivi (Open/In Progress) vs Storico (Closed/Resolved)
  const filteredTickets = tickets.filter(t => {
    const isClosed = t.status === 'Risolto' || t.status === 'Chiuso' || t.status === 'closed';
    if (activeTab === 'active') return !isClosed;
    return isClosed;
  });

  const renderTicket = ({ item }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => navigation.navigate('TicketDetail', { id: item.id })}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.categoria === 'Verde' ? 'leaf' : 'construct'} size={24} color="#555" />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.ticketTitle} numberOfLines={1}>{item.titolo || item.title}</Text>
        <Text style={styles.ticketSub}>#{item.id} • {item.data || item.creation_date}</Text>
        <Text style={{fontSize:12, color:'#777'}} numberOfLines={1}>{item.indirizzo || 'Nessun indirizzo'}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'Risolto' ? '#D1E7DD' : '#FFF3CD' }]}>
        <Text style={{ color: item.status === 'Risolto' ? '#0F5132' : '#856404', fontWeight: 'bold', fontSize: 10 }}>
          {(item.status || 'APERTO').toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Custom Integrato */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Ciao, {user?.name?.split(' ')[0] || 'Cittadino'}! 👋</Text>
          <Text style={styles.subText}>Ecco la situazione nel tuo comune.</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
           <Ionicons name="notifications-outline" size={24} color="white" />
           <View style={styles.redDot} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Tab Switcher Funzionante */}
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'active' && styles.activeTab]} 
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>IN CORSO</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>STORICO</Text>
          </TouchableOpacity>
        </View>

        {/* Lista Ticket */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={item => String(item.id)}
            renderItem={renderTicket}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListEmptyComponent={
              <View style={{alignItems:'center', marginTop:50}}>
                <Ionicons name="folder-open-outline" size={48} color="#ccc" />
                <Text style={{color:'#999', marginTop:10}}>Nessuna segnalazione in questa lista.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Map')}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20, paddingTop: 60,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.1, shadowRadius:4, elevation:5
  },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: '800' },
  subText: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 13 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center'},
  redDot: { position:'absolute', top:10, right:12, width:8, height:8, borderRadius:4, backgroundColor: COLORS.accent },
  
  body: { flex: 1, padding: 20, marginTop: -20 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, marginBottom: 15, elevation: 3 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: '#999', fontWeight: '600', fontSize:13 },
  activeTabText: { color: 'white' },
  
  ticketCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor:'#000', shadowOpacity:0.05 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' },
  ticketTitle: { fontWeight: '700', fontSize: 16, color: '#1D3461', width: '90%' },
  ticketSub: { color: '#888', fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', elevation: 6 }
});

export default CitizenHomeScreen;