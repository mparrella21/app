import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// Se hai un file di colori globali, lo usiamo, altrimenti usiamo i colori hardcoded
import { COLORS } from '../styles/global'; 

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
        "Logout",
        "Sei sicuro di voler uscire?",
        [
            { text: "Annulla", style: "cancel" },
            { 
                text: "Esci", 
                style: "destructive", 
                onPress: () => {
                    logout();
                    // Resetta la navigazione per impedire di tornare indietro col tasto fisico
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }], // O 'Home' a seconda di come hai chiamato lo stack iniziale
                    });
                }
            }
        ]
    );
  };

  // Se l'utente non è caricato, non mostrare nulla per evitare errori
  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Header colorato */}
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
                <Text style={styles.avatarText}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>
                {user.role ? user.role.toUpperCase() : 'OSPITE'}
            </Text>
        </View>

        {/* --- SEZIONE MENU IN BASE AL RUOLO --- */}
        
        {/* 1. CITTADINO */}
        {user.role === 'cittadino' && (
            <View style={styles.menuGroup}>
                <Text style={styles.menuTitle}>Le tue attività</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('UserTickets')}>
                    <View style={[styles.iconBox, { backgroundColor: '#467599' }]}>
                        <Ionicons name="list" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Le mie segnalazioni</Text>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
            </View>
        )}

        {/* 2. OPERATORE */}
        {user.role === 'operatore' && (
            <View style={styles.menuGroup}>
                <Text style={styles.menuTitle}>Gestione Operativa</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('OperatorTickets')}>
                    <View style={[styles.iconBox, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="construct" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Ticket Assegnati</Text>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
            </View>
        )}

        {/* 3. RESPONSABILE / ADMIN */}
        {(user.role === 'responsabile' || user.role === 'admin') && (
            <View style={styles.menuGroup}>
                <Text style={styles.menuTitle}>Amministrazione</Text>
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ResponsibleTickets')}>
                    <View style={[styles.iconBox, { backgroundColor: '#10B981' }]}>
                        <Ionicons name="folder-open" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Gestione Ticket Comune</Text>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ManageOperators')}>
                    <View style={[styles.iconBox, { backgroundColor: '#6366F1' }]}>
                        <Ionicons name="people" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Gestione Operatori</Text>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
            </View>
        )}

        {/* DETTAGLI ACCOUNT (VISIBILE A TUTTI) */}
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
                    <Text style={styles.value}>{user.municipality || 'Comune di Fisciano (Demo)'}</Text>
                </View>
            </View>
        </View>

        {/* LOGOUT */}
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

  menuGroup: { marginBottom: 20 },
  menuTitle: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginBottom: 8, marginLeft: 5, textTransform: 'uppercase' },
  
  actionBtn: { backgroundColor: 'white', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionText: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },

  section: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  infoTextContainer: { marginLeft: 15 },
  label: { fontSize: 12, color: '#999' },
  value: { fontSize: 15, color: '#333', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  
  logoutBtn: { backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ffcdd2', marginTop: 10, marginBottom: 30 },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 }
});