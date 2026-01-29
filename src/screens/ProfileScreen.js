import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  if (!user) {
    navigation.replace('Home');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Area Personale</Text>
            <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* CARD UTENTE */}
        <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
        </View>

        {/* --- NUOVO: SEZIONE TICKET (Solo per Cittadini) --- */}
        {user.role === 'cittadino' && (
            <TouchableOpacity style={styles.ticketActionBtn} onPress={() => navigation.navigate('UserTickets')}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={styles.iconBox}>
                        <Ionicons name="list" size={24} color="white" />
                    </View>
                    <Text style={styles.ticketBtnText}>Le mie segnalazioni</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#1F2937" />
            </TouchableOpacity>
        )}

        {/* DETTAGLI */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dettagli Account</Text>
            <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{user.email}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                    <Text style={styles.label}>Comune</Text>
                    <Text style={styles.value}>{user.municipality || 'Non assegnato'}</Text>
                </View>
            </View>
        </View>

        {/* OPZIONI */}
        <View style={styles.section}>
            <TouchableOpacity style={styles.optionRow}>
                <Ionicons name="settings-outline" size={22} color="#1F2937" />
                <Text style={styles.optionText}>Impostazioni</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ESCI</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#1F2937', paddingBottom: 15 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  scroll: { padding: 20 },
  profileCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 20, elevation: 2 },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  userRole: { fontSize: 11, color: '#666', marginTop: 2, letterSpacing: 1 },
  
  // Stile Bottone "I Miei Ticket"
  ticketActionBtn: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  ticketBtnText: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },

  section: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  infoTextContainer: { marginLeft: 15 },
  label: { fontSize: 12, color: '#999' },
  value: { fontSize: 15, color: '#333', fontWeight: '500' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  optionText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  logoutBtn: { backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ffcdd2' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 }
});