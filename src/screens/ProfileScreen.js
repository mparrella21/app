import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateProfile, deleteUser, deleteManager } from '../services/userService';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../styles/global'; // Per i colori
import { getTenantById } from '../services/tenantService';
export default function ProfileScreen({ navigation , route}) {
  const { user, logout, setUser } = useAuth(); 
  
  const activeTenantName = route.params?.activeTenantName;
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedTenantName, setFetchedTenantName] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

  useEffect(() => {
    if (user) {
        setEditName(user.name || '');
        setEditSurname(user.surname || '');
        setEditPhone(user.phonenumber || '');
        
        // QUI LA MODIFICA: Convertiamo subito nel formato editabile standard
        setEditBirthDate(formatDateForInput(user.birth_date)); 
    }
  }, [user]);

  useEffect(() => {
    const fetchTenantInfo = async () => {
        // Esegui solo se l'utente ha un tenant_id (quindi è Op o Resp)
        if (user && user.tenant_id) {
            try {
                const tenantData = await getTenantById(user.tenant_id);
                if (tenantData) {
                    // Controlla come il backend restituisce il nome (di solito 'label' o 'name')
                    setFetchedTenantName(tenantData.label || tenantData.name || 'Sconosciuto');
                }
            } catch (err) {
                console.log("Errore recupero nome tenant", err);
            }
        }
    };
    fetchTenantInfo();
  }, [user]);

  const getNormalizedRole = () => {
    if (!user || !user.role) return '';
    const r = String(user.role).toLowerCase();
    if (r === '1') return 'cittadino';
    if (r === '2') return 'operatore';
    if (r === '3' || r === '4') return 'responsabile'; 
    return r;
  };
  const currentRole = getNormalizedRole();

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
  //funzione per copia e incolla id utente
  const handleCopyId = async () => {
    if (user?.id) {
        await Clipboard.setStringAsync(user.id);
        Alert.alert("Copiato!", "L'ID utente è stato copiato negli appunti.");
    }
};
  // NUOVA FUNZIONE: ELIMINA ACCOUNT (Requisito Profilo)
 const handleDeleteAccount = () => {
    Alert.alert(
        "Elimina Account",
        "ATTENZIONE: Questa operazione è irreversibile. Il tuo account e tutti i dati associati verranno eliminati definitivamente. Vuoi procedere?",
        [
            { text: "Annulla", style: "cancel" },
            { 
                text: "Sì, Elimina", 
                style: "destructive", 
                onPress: async () => {
                    setIsLoading(true);

                    const success = await deleteUser(user.id);
                    setIsLoading(false);

                    if (success) {
                        Alert.alert("Account Eliminato", "Il tuo account è stato rimosso.");
                        logout();
                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                    } else {
                        Alert.alert("Errore", "Impossibile eliminare l'account. Riprova più tardi.");
                    }
                }
            }
        ]
    );
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Se non è valida, ritorna l'originale
    
    // Opzioni per: "14 May 2002"
    // Usa 'it-IT' se vuoi "14 Maggio 2002", 'en-GB' per "14 May 2002"
    return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
};

// Funzione per convertire QUALSIASI data in YYYY-MM-DD per l'input
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Costruisce YYYY-MM-DD manualmente per evitare slittamenti di fuso orario
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Funzione per formattare il telefono "carino"
const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    // Pulisce eventuali spazi esistenti
    const cleaned = phone.replace(/\s/g, '');
    // Regex per formattare tipo: 333 123 4567
    // Adatta la regex se i tuoi numeri hanno lunghezze diverse
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
};
  const toggleEdit = () => {
    console.log("Toggling edit mode. Current user data:", user);
    if (!isEditing) {
        // Reset ai valori originali se annullo, oppure preparo i valori per la modifica
        setEditName(user.name || '');
        setEditSurname(user.surname || '');
        setEditPhone(user.phonenumber || '');
        setEditBirthDate(user.birth_date || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
        Alert.alert("Errore", "Il nome è obbligatorio.");
        return;
    }

    setIsLoading(true);

    // Costruiamo il payload ESATTAMENTE come richiesto dalla PUT profile
    // Nota: Non inviamo password o email.
    const payload = {
        name: editName,
        surname: editSurname,
        phonenumber: editPhone,
        birth_date: editBirthDate // Assicurati di inserire il formato che il DB si aspetta (es. YYYY-MM-DD)
    };

    const success = await updateProfile(user.id, payload);

    setIsLoading(false);

    if (success) {
        Alert.alert("Successo", "Profilo aggiornato correttamente.");
        // Aggiorniamo il contesto globale e lo storage locale con i nuovi dati
        // Manteniamo i dati vecchi (email, ruolo, id) e sovrascriviamo quelli modificati
        setUser({ ...user, ...payload });
        setIsEditing(false);
    } else {
        Alert.alert("Errore", "Impossibile aggiornare il profilo.");
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
        
        {/* CARD PROFILO */}
        <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
            </View>

            {isEditing ? (
                <View style={styles.editContainer}>
                    <Text style={styles.labelInput}>Nome *</Text>
                    <TextInput 
                        style={styles.input}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Nome"
                    />
                    
                    <Text style={styles.labelInput}>Cognome</Text>
                    <TextInput 
                        style={styles.input}
                        value={editSurname}
                        onChangeText={setEditSurname}
                        placeholder="Cognome"
                    />

                    <Text style={styles.labelInput}>Telefono</Text>
                    <TextInput 
                        style={styles.input}
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="Numero di telefono"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.labelInput}>Data di Nascita (YYYY-MM-DD)</Text>
                    <TextInput 
                        style={styles.input}
                        value={editBirthDate}
                        onChangeText={setEditBirthDate}
                        placeholder="Es. 1990-12-31"
                    />
                </View>
            ) : (
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.userName}>{user.name} {user.surname}</Text>
                    <Text style={styles.userRole}>
                        {currentRole ? currentRole.toUpperCase() : 'OSPITE'}
                    </Text>
                    {/* Mostra dettagli extra se presenti */}
                    {(user.phonenumber || user.birth_date) && (
                        <View style={{marginTop: 5, alignItems: 'center'}}>
                             {user.phonenumber ? (
                                <Text style={styles.subDetail}>
                                    📞 +39 {formatPhoneForDisplay(user.phonenumber)}
                                </Text>
                             ) : null}
                             {user.birth_date ? (
                                <Text style={styles.subDetail}>
                                    {/* Usa la funzione formatDateForDisplay */}
                                    🎂 {formatDateForDisplay(user.birth_date)}
                                </Text>
                             ) : null}
                        </View>
                    )}
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
                        <Text style={styles.saveBtnText}>SALVA DATI ANAGRAFICI</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>

        {!isEditing && (
        <>
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

            {/*currentRole === 'operatore' && (
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
            )*/}

            {(currentRole === 'responsabile' || currentRole === 'admin') && (
                <View style={styles.menuGroup}>



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

        {!isEditing && (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dettagli Account</Text>
               {/* Riga id utente */}
            <View style={styles.infoRow}>
    <Ionicons name="id-card-outline" size={20} color="#666" />
    
    {/* Rendiamo cliccabile il contenitore del testo */}
    <TouchableOpacity 
        style={styles.infoTextContainer} 
        onPress={handleCopyId}
        activeOpacity={0.6} // Feedback visivo al tocco
    >
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.label}>ID Utente (Tocca per copiare)</Text>
            {/* Piccola icona copia opzionale per far capire l'azione */}
            <Ionicons name="copy-outline" size={14} color={COLORS.primary} style={{marginLeft: 5}}/>
        </View>

        <Text style={[styles.value, styles.multilineId]} 
        selectable={true} >
        {user?.id || 'Non disponibile'}
        </Text>
            </TouchableOpacity>
        </View>
            
            <View style={styles.divider} />
            
            {/* Riga Email */}
            <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{user.email || 'Non disponibile'}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            {/* Riga Comune - Dinamica in base al ruolo */}
            <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                    <Text style={styles.label}>
                        {currentRole === 'cittadino' ? 'Posizione Attuale / Selezionata' : 'Comune di Competenza'}
                    </Text>
                    <Text style={styles.value}>
                        {currentRole === 'cittadino' 
                            ? (activeTenantName || 'Nessun comune selezionato') 
                            : (fetchedTenantName || (user.tenant_id ? 'Caricamento...' : 'Non assegnato'))}
                    </Text>
                </View>
            </View>
        </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ESCI</Text>
        </TouchableOpacity>

        {/* NUOVO: ZONA PERICOLOSA ELIMINAZIONE ACCOUNT */}
        {isEditing && (
            <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Zona Pericolosa</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={isLoading}>
                    <Ionicons name="trash-outline" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={styles.deleteText}>ELIMINA ACCOUNT DEFINITIVAMENTE</Text>
                </TouchableOpacity>
            </View>
        )}

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
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 },
  
  // Stili per Zona Pericolosa
  dangerZone: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FECACA' },
  dangerTitle: { color: '#DC2626', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  deleteBtn: { flexDirection: 'row', backgroundColor: '#DC2626', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  deleteText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});