import React, { useState, useEffect, useContext } from 'react';
import { View, Text, SectionList, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    getManagersByTenant, 
    promoteToManager, 
    deleteManager, 
    getAllUsers 
} from '../services/userService';
import { getAllTenants } from '../services/tenantService';
import { AuthContext } from '../context/AuthContext';

export default function ManageResponsibleScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();


  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [mainSearchText, setMainSearchText] = useState(''); 

  const [modalVisible, setModalVisible] = useState(false);
  const [targetTenant, setTargetTenant] = useState(null); 
  const [allUsers, setAllUsers] = useState([]); 
  const [selectableUsers, setSelectableUsers] = useState([]); 
  const [modalSearchText, setModalSearchText] = useState(''); 
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);


  const fetchAllData = async () => {
    setLoading(true);
    try {
        const tenants = await getAllTenants();
        
        const promises = tenants.map(async (tenant) => {
            const managers = await getManagersByTenant(tenant.id);
            return {
                title: tenant.label || tenant.name, // Nome del Comune
                tenantId: tenant.id,
                data: managers // Lista responsabili
            };
        });

        const results = await Promise.all(promises);
        
        results.sort((a, b) => a.title.localeCompare(b.title));
        
        setSections(results);
        setFilteredSections(results); 
    } catch (e) {
        console.error("Errore fetchAllData", e);
        Alert.alert("Errore", "Impossibile caricare i dati dei comuni.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleMainSearch = (text) => {
      setMainSearchText(text);
      if (!text) {
          setFilteredSections(sections);
          return;
      }
      const lower = text.toLowerCase();
      
      const filtered = sections.map(section => {
          const tenantMatches = section.title.toLowerCase().includes(lower);
          
          const matchingManagers = section.data.filter(m => 
              (m.name && m.name.toLowerCase().includes(lower)) ||
              (m.surname && m.surname.toLowerCase().includes(lower)) ||
              (m.email && m.email.toLowerCase().includes(lower))
          );

          if (tenantMatches || matchingManagers.length > 0) {
              return {
                  ...section,
                  data: matchingManagers 
              };
          }
          return null;
      }).filter(Boolean); 

      const refinedFiltered = filtered.map(section => {
          const originalSection = sections.find(s => s.tenantId === section.tenantId);
          if (originalSection.title.toLowerCase().includes(lower)) {
              return originalSection; 
          }
          return section;
      });

      setFilteredSections(refinedFiltered);
  };


  const openPromoteModalForTenant = async (tenantId, tenantName) => {
      setTargetTenant({ id: tenantId, name: tenantName });
      setModalVisible(true);
      setLoadingUsers(true);
      setModalSearchText('');

      try {
          let usersList = allUsers;
          if (usersList.length === 0) {
             usersList = await getAllUsers();
             const uniqueUsers = Array.from(new Map(usersList.map(item => [item.id, item])).values());
             setAllUsers(uniqueUsers);
             usersList = uniqueUsers;
          }

          const globalManagerIds = new Set();
          
          sections.forEach(section => {
              if (section.data && section.data.length > 0) {
                  section.data.forEach(mgr => {
                      if (mgr.id) globalManagerIds.add(String(mgr.id));
                  });
              }
          });

          const available = usersList.filter(u => !globalManagerIds.has(String(u.id)));
          setSelectableUsers(available);

      } catch (e) {
          Alert.alert("Errore", "Impossibile recuperare la lista utenti.");
      } finally {
          setLoadingUsers(false);
      }
  };

  const getModalFilteredUsers = () => {
      if (!modalSearchText) return selectableUsers;
      const lower = modalSearchText.toLowerCase();
      return selectableUsers.filter(u => 
          (u.name && u.name.toLowerCase().includes(lower)) ||
          (u.surname && u.surname.toLowerCase().includes(lower)) ||
          (u.email && u.email.toLowerCase().includes(lower)) ||
          String(u.id).includes(lower)
      );
  };

  // --- AZIONI (Promuovi / Rimuovi) ---

  const handlePromote = async (targetUser) => {
    if (!targetTenant) return;

    Alert.alert(
        "Conferma Promozione",
        `Vuoi rendere Responsabile l'utente ${targetUser.name} ${targetUser.surname} per il comune di ${targetTenant.name}?`,
        [
            { text: "Annulla", style: "cancel" },
            { text: "Promuovi", onPress: async () => {
                setActionLoading(true);
                const result = await promoteToManager(targetUser.id, targetTenant.id);
                setActionLoading(false);

                if (result.success) {
                    Alert.alert("Successo", `Utente aggiunto a ${targetTenant.name}!`);
                    setModalVisible(false);
                    fetchAllData(); // Ricarica tutto
                } else {
                    Alert.alert("Errore", result.error || "Impossibile completare l'operazione.");
                }
            }}
        ]
    );
  };

  const handleDelete = (manager, tenantId) => {
      Alert.alert(
          "Rimuovi Responsabile", 
          `Revocare i permessi a ${manager.name} ${manager.surname}?`,
          [
              { text: "Annulla", style: "cancel" },
              { text: "Rimuovi", style: 'destructive', onPress: async () => {
                  setLoading(true);
                  const success = await deleteManager(manager.id, tenantId);
                  if (success) {
                      Alert.alert("Rimosso", "Ruolo rimosso con successo.");
                      fetchAllData();
                  } else {
                      setLoading(false);
                      Alert.alert("Errore", "Impossibile rimuovere il responsabile.");
                  }
              }}
          ]
      );
  };

  // --- RENDER COMPONENTI UI ---

  const renderSectionHeader = ({ section: { title, tenantId } }) => (
    <View style={styles.sectionHeader}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Ionicons name="business" size={18} color={COLORS.primary} style={{marginRight: 6}} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity 
            style={styles.addBtnSmall} 
            onPress={() => openPromoteModalForTenant(tenantId, title)}
        >
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addBtnText}>AGGIUNGI</Text>
        </TouchableOpacity>
    </View>
  );

  const renderManagerItem = ({ item, section }) => (
    <View style={styles.card}>
      <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: '#E8F5E9' }]}>
             <Ionicons name="briefcase" size={20} color="#2E7D32" />
        </View>
        <View style={{marginLeft: 10, flex:1}}>
             <Text style={styles.opName}>{item.name} {item.surname}</Text>
             <Text style={styles.opEmail}>{item.email || `ID: ${item.id}`}</Text>
             {item.phonenumber && <Text style={styles.opSub}>Tel: {item.phonenumber}</Text>}
        </View>
      </View>
      
      <TouchableOpacity onPress={() => handleDelete(item, section.tenantId)} style={{padding:8}}>
          <Ionicons name="trash-outline" size={22} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  const renderUserSelectionItem = ({item}) => (
    <TouchableOpacity style={styles.userSelectCard} onPress={() => handlePromote(item)} disabled={actionLoading}>
        <View style={styles.avatarPlaceholderSmall}>
            <Text style={{fontWeight:'bold', color:'#666'}}>{item.name ? item.name[0] : '?'}</Text>
        </View>
        <View style={{marginLeft: 10, flex: 1}}>
            <Text style={styles.userSelectName}>{item.name} {item.surname}</Text>
            <Text style={styles.userSelectEmail}>{item.email}</Text>
            <Text style={styles.userSelectId}>ID: {item.id}</Text>
        </View>
        <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      
      {/* HEADER PRINCIPALE */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:5, marginRight:10}}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Responsabili Globali</Text>
      </View>
      
      {/* BARRA DI RICERCA PRINCIPALE */}
      <View style={styles.mainSearchBox}>
          <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
          <TextInput 
              style={{flex:1}} 
              placeholder="Cerca responsabile o comune..." 
              value={mainSearchText}
              onChangeText={handleMainSearch}
          />
          {mainSearchText.length > 0 && (
              <TouchableOpacity onPress={() => handleMainSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
          )}
      </View>

      <Text style={styles.subtitle}>
         Gestione responsabili per tutti i tenant attivi.
      </Text>

      {/* LISTA TENANT E RESPONSABILI */}
      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:20}} />
      ) : (
          <SectionList
            sections={filteredSections}
            keyExtractor={(item, index) => item.id + "-" + index}
            renderItem={renderManagerItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{paddingBottom: 40}}
            ListEmptyComponent={<Text style={styles.emptyText}>Nessun responsabile trovato.</Text>}
            stickySectionHeadersEnabled={false}
          />
      )}

      {/* MODALE SELEZIONE UTENTE */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <View>
                      <Text style={styles.modalTitle}>Aggiungi Responsabile</Text>
                      <Text style={styles.modalSubtitle}>Comune di {targetTenant?.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Text style={{color: COLORS.primary, fontSize: 16, fontWeight: '600'}}>Chiudi</Text>
                  </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                  <Ionicons name="search" size={20} color="#999" style={{marginRight: 8}} />
                  <TextInput 
                      style={{flex:1, height: 40}}
                      placeholder="Cerca utente da promuovere..."
                      value={modalSearchText}
                      onChangeText={setModalSearchText}
                  />
              </View>

              {loadingUsers ? (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 40}} />
              ) : (
                  <FlatList 
                      data={getModalFilteredUsers()}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={renderUserSelectionItem}
                      ListEmptyComponent={
                          <Text style={styles.emptyText}>
                             Nessun utente disponibile o tutti gli utenti sono già responsabili (in questo o altri comuni).
                          </Text>
                      }
                      contentContainerStyle={{paddingBottom: 20}}
                  />
              )}
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 10, marginLeft: 4 },
  
  mainSearchBox: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#fff', 
      paddingHorizontal: 12, 
      paddingVertical: 10, 
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#eee',
      elevation: 1
  },

  sectionHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      backgroundColor: '#eceff1', 
      paddingVertical: 8, 
      paddingHorizontal: 10,
      marginTop: 15,
      marginBottom: 5,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#455A64' },
  addBtnSmall: { 
      flexDirection: 'row', 
      backgroundColor: COLORS.primary, 
      paddingVertical: 4, 
      paddingHorizontal: 8, 
      borderRadius: 4, 
      alignItems: 'center' 
  },
  addBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },

  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 8, elevation: 1, marginHorizontal: 2 },
  opName: { fontWeight: '700', fontSize: 15, color:'#333' },
  opEmail: { color: '#666', fontSize: 12 },
  opSub: { color: '#999', fontSize: 11, marginTop: 1 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center'},
  
  emptyText: { textAlign:'center', marginTop: 30, color:'#666', fontStyle: 'italic', paddingHorizontal: 20 },

  // MODAL STYLES
  modalContainer: { flex: 1, backgroundColor: '#f9f9f9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', margin: 16, paddingHorizontal: 10, borderRadius: 8 },
  
  userSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginHorizontal: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatarPlaceholderSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  userSelectName: { fontWeight: '600', fontSize: 15, color: '#333' },
  userSelectEmail: { fontSize: 12, color: '#666' },
  userSelectId: { fontSize: 10, color: '#999' }
});