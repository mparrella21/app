import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/userService';

export default function ProfileScreen({ navigation }) {
  const { user, logout, setUser } = useAuth(); 
  
  // Stati per la modalità modifica
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Campi form
  const [editName, setEditName] = useState(user ? user.name : '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- FIX RUOLI: Normalizza il ruolo (gestisce numeri e stringhe) ---
  const getNormalizedRole = () => {
    if (!user || !user.role) return '';
    const r = String(user.role).toLowerCase();
    if (r === '1') return 'cittadino';
    if (r === '2') return 'operatore';
    if (r === '3' || r === '4') return 'responsabile'; // 3=Resp, 4=Admin
    return r;
  };
  const currentRole = getNormalizedRole();
  // -----------------------------------------------------------------

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
                    setTimeout(() => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }], 
                        });
                    }, 100);
                }
            }
        ]
    );
  };

  const toggleEdit = () => {
    if (!isEditing) {
        setEditName(user.name);
        setNewPassword('');
        setConfirmPassword('');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
        Alert.alert("Errore", "Il nome non può essere vuoto.");
        return;
    }
    if (newPassword && newPassword !== confirmPassword) {
        Alert.alert("Errore", "Le password non coincidono.");
        return;
    }
    if (newPassword && newPassword.length < 6) {
        Alert.alert("Errore", "La password deve essere di almeno 6 caratteri.");
        return;
    }

    setIsLoading(true);

    const payload = {
        name: editName,
        password: newPassword ? newPassword : undefined 
    };

    const result = await updateUserProfile(user.id, payload);

    setIsLoading(false);

    if (result.success) {
        Alert.alert("Successo", "Profilo aggiornato correttamente.");
        setUser({ ...user, name: editName });
        setIsEditing(false);
    } else {
        Alert.alert("Errore", result.message || "Impossibile aggiornare il profilo.");
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Area Personale</Text>
            
            <TouchableOpacity onPress={toggleEdit}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>
                    {isEditing ? 'ANNULLA' : 'MODIFICA'}
                </Text>
            </TouchableOpacity>
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

            {isEditing ? (
                <View style={styles.editContainer}>
                    <Text style={styles.labelInput}>Nome e Cognome</Text>
                    <TextInput 
                        style={styles.input}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Nome e Cognome"
                    />
                </View>
            ) : (
                <Text style={styles.userName}>{user.name}</Text>
            )}

            {/* FIX: Mostriamo il ruolo normalizzato in maiuscolo */}
            <Text style={styles.userRole}>
                {currentRole ? currentRole.toUpperCase() : 'OSPITE'}
            </Text>

            {isEditing && (
                <View style={[styles.editContainer, {marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15}]}>
                    <Text style={[styles.labelInput, {marginBottom: 10, color: '#F59E0B'}]}>Cambio Password (Opzionale)</Text>
                    <TextInput 
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Nuova Password"
                        secureTextEntry
                    />
                    <TextInput 
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Conferma Password"
                        secureTextEntry
                    />
                </View>
            )}

            {isEditing && (
                <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={handleSaveProfile}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveBtnText}>SALVA MODIFICHE</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>

        {/* --- MENU (Visibili solo se NON si è in modifica) --- */}
        {!isEditing && (
        <>
            {/* --- MENU CITTADINO --- */}
            {currentRole === 'cittadino' && (
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

            {/* --- MENU OPERATORE --- */}
            {currentRole === 'operatore' && (
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

            {/* --- MENU RESPONSABILE --- */}
            {(currentRole === 'responsabile' || currentRole === 'admin') && (
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
        </>
        )}

        {/* DETTAGLI ACCOUNT */}
        {!isEditing && (
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
        )}

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
  editContainer: { width: '100%', marginTop: 10 },
  labelInput: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 16 },
  saveBtn: { backgroundColor: '#1F2937', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
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