import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOperatorsByTenant, promoteToOperator, deleteUser, getUserById, updateProfile } from '../services/userService';
import { getOperatorCategories, assignOperatorCategory } from '../services/interventionService';
import { AuthContext } from '../context/AuthContext';

export default function ManageOperatorsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState([]); 
  const [loadingCats, setLoadingCats] = useState(false);

  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [targetId, setTargetId] = useState(''); // ID Utente invece di Email
  const [opName, setOpName] = useState(''); 
  const [opSurname, setOpSurname] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const [catModalVisible, setCatModalVisible] = useState(false);

  const fetchOperators = async () => {
    setLoading(true);
    if (user?.tenant_id) {
        const data = await getOperatorsByTenant(user.tenant_id);
        setOperators(data);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
      setLoadingCats(true);
      try {
          const cats = await getOperatorCategories();
          setCategories(cats || []);
      } catch (e) {
          console.error("Errore fetch categorie", e);
      } finally {
          setLoadingCats(false);
      }
  };

  useEffect(() => {
    fetchOperators();
    fetchCategories();
  }, [user]);

  const openPromoteMode = () => {
      setIsEditing(false);
      setEditingId(null);
      setTargetId(''); 
      setSelectedCategory(null);
      setModalFormVisible(true);
  };

  const openEditMode = (op) => {
      setIsEditing(true);
      setEditingId(op.id);
      setOpName(op.name || '');
      setOpSurname(op.surname || '');
      setTargetId(String(op.id)); 
      
      const catObj = categories.find(c => c.id === op.category_id || c.label === op.category) || null;
      setSelectedCategory(catObj);
      setModalFormVisible(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert("Errore", "Seleziona una categoria per l'operatore.");
      return;
    }

    setActionLoading(true);

    try {
        if (isEditing) {
            const updateData = { name: opName, surname: opSurname }; 
            const updated = await updateProfile(editingId, updateData);
            
            if (updated) {
                await assignOperatorCategory(editingId, user.tenant_id, selectedCategory.id);
                Alert.alert("Successo", "Dati operatore aggiornati!");
                setModalFormVisible(false);
                fetchOperators();
            } else {
                Alert.alert("Errore", "Impossibile aggiornare l'operatore.");
            }
        } else {
            // PROMOZIONE TRAMITE ID
            if (!targetId) {
                Alert.alert("Errore", "Inserisci l'ID dell'utente cittadino.");
                setActionLoading(false);
                return;
            }

            // 1. Verifichiamo che l'utente esista usando l'ID (Permesso a tutti)
            const existingUser = await getUserById(targetId.trim());
            
            if (!existingUser) {
                Alert.alert("Utente non trovato", "Nessun utente trovato con questo ID.");
                setActionLoading(false);
                return;
            }

            // 2. Chiamata API promozione
            const result = await promoteToOperator(existingUser.id, user.tenant_id, selectedCategory.id);
            
            if (result && result.success) {
                Alert.alert("Successo", `${existingUser.name || 'Utente'} è ora un operatore!`);
                setModalFormVisible(false);
                fetchOperators();
            } else {
                Alert.alert("Errore", result.error || "Impossibile promuovere l'utente.");
            }
        }
    } catch (e) {
        Alert.alert("Errore", "Si è verificato un errore di rete.");
        console.error(e);
    } finally {
        setActionLoading(false);
    }
  };

  const handleDelete = (op) => {
      Alert.alert(
          "Rimuovi Operatore", 
          `Rimuovere il ruolo operatore a ${op.name || 'Utente'}?`,
          [
              { text: "Annulla", style: "cancel" },
              { text: "Rimuovi", style: 'destructive', onPress: async () => {
                  setLoading(true);
                  const success = await deleteUser(op.id, user.tenant_id);
                  if (success) {
                      Alert.alert("Rimosso", "Ruolo operatore revocato.");
                      fetchOperators();
                  } else {
                      setLoading(false);
                      Alert.alert("Errore", "Impossibile rimuovere l'operatore.");
                  }
              }}
          ]
      );
  };

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
        <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={20} color="#fff" />
        </View>
        <View style={{marginLeft: 10, flex:1}}>
             <Text style={styles.opName}>{item.name} {item.surname}</Text>
             <Text style={styles.opEmail}>{item.email || `ID: ${item.id}`}</Text>
             {item.category && <Text style={styles.opCat}>Categoria: {item.category}</Text>}
        </View>
      </View>
      
      <View style={{flexDirection:'row'}}>
          <TouchableOpacity onPress={() => openEditMode(item)} style={{padding:8, marginRight:5}}>
              <Ionicons name="create-outline" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={{padding:8}}>
              <Ionicons name="trash-outline" size={24} color="#D32F2F" />
          </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gestione Operatori</Text>
        <TouchableOpacity onPress={openPromoteMode} style={styles.addBtnHeader}>
            <Ionicons name="person-add" size={20} color="white" />
            <Text style={{color:'white', fontWeight:'bold', marginLeft:5}}>Aggiungi</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
          Operatori attivi nel tuo comune. ({user?.tenant_id ? 'Tenant Attivo' : '...'})
      </Text>

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary || '#007BFF'} style={{marginTop:20}} />
      ) : (
          <FlatList 
            data={operators} 
            keyExtractor={item => item.id ? String(item.id) : Math.random().toString()} 
            renderItem={renderItem}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#666'}}>Nessun operatore presente.</Text>}
            contentContainerStyle={{paddingBottom: 20}}
          />
      )}

      {/* MODALE FORM */}
      <Modal visible={modalFormVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{isEditing ? "Modifica Operatore" : "Promuovi Utente"}</Text>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    
                    {!isEditing && (
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={24} color="#0056b3" />
                            <Text style={styles.infoText}>
                                A causa delle restrizioni di sicurezza, non è possibile cercare gli utenti per email.
                                {'\n\n'}
                                <Text style={{fontWeight:'bold'}}>Inserisci l'ID Utente</Text> del cittadino che vuoi promuovere.
                                L'utente può trovare il suo ID nella schermata Profilo.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.label}>{isEditing ? "ID Utente (Non modificabile)" : "ID Utente *"}</Text>
                    <TextInput 
                        style={[styles.input, isEditing && {backgroundColor: '#e0e0e0', color: '#888'}]} 
                        value={targetId} 
                        onChangeText={setTargetId} 
                        placeholder="es. 123" 
                        keyboardType="numeric"
                        autoCapitalize="none" 
                        editable={!isEditing} 
                    />

                    {isEditing && (
                        <>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput style={styles.input} value={opName} onChangeText={setOpName} placeholder="Nome" />
                            
                            <Text style={styles.label}>Cognome</Text>
                            <TextInput style={styles.input} value={opSurname} onChangeText={setOpSurname} placeholder="Cognome" />
                        </>
                    )}
                    
                    <Text style={styles.label}>Categoria Operatore *</Text>
                    <TouchableOpacity style={styles.catSelector} onPress={() => setCatModalVisible(true)}>
                        <Text style={{color: selectedCategory ? '#333' : '#999'}}>
                            {selectedCategory ? selectedCategory.label : "Seleziona Categoria..."}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.formButtons}>
                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalFormVisible(false)} disabled={actionLoading}>
                            <Text style={styles.btnTextCancel}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} disabled={actionLoading}>
                            {actionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnTextSave}>{isEditing ? "Salva Modifiche" : "Promuovi"}</Text>}
                        </TouchableOpacity>
                    </View>
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* MODALE CATEGORIA */}
      <Modal visible={catModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {maxHeight: '50%'}]}>
                  <Text style={styles.modalTitle}>Scegli Categoria</Text>
                  {loadingCats ? (
                      <ActivityIndicator color={COLORS.primary} />
                  ) : categories.length === 0 ? (
                      <Text style={{textAlign:'center', color:'#666'}}>Nessuna categoria disponibile.</Text>
                  ) : (
                    <ScrollView>
                        {categories.map((cat) => (
                            <TouchableOpacity key={cat.id} style={styles.catOption} onPress={() => { setSelectedCategory(cat); setCatModalVisible(false); }}>
                                <Text style={styles.catOptionText}>{cat.label}</Text>
                                {selectedCategory?.id === cat.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity style={{alignSelf:'center', padding:10, marginTop:10}} onPress={() => setCatModalVisible(false)}>
                      <Text style={{color: 'red'}}>Chiudi</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: COLORS.bg || '#F5F5F5' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary || '#007BFF' },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 15 },
  addBtnHeader: { flexDirection:'row', backgroundColor: COLORS.primary || '#007BFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems:'center', elevation: 2 },
  
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  opName: { fontWeight: '700', fontSize: 16, color:'#333' },
  opEmail: { color: '#666', fontSize: 13 },
  opCat: { color: '#007BFF', fontSize: 12, marginTop: 2, fontWeight:'600' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center'},
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign:'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  catSelector: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems:'center' },
  
  infoBox: { backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { color: '#0d47a1', fontSize: 12, marginLeft: 8, flex: 1 },

  formButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#E0E0E0' },
  btnSave: { backgroundColor: COLORS.primary || '#007BFF' },
  btnTextCancel: { color: '#333', fontWeight: 'bold' },
  btnTextSave: { color: 'white', fontWeight: 'bold' },

  catOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection:'row', justifyContent:'space-between' },
  catOptionText: { fontSize: 16, color: '#333' }
});