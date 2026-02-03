import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { getOperators, createOperator, updateOperator, deleteUser } from '../services/userService';
// FIX: Importiamo le categorie operatore da interventionService invece che da ticketService
import { getOperatorCategories, assignOperatorCategory } from '../services/interventionService';
import { useAuth } from '../context/AuthContext';

export default function ManageOperatorsScreen({ navigation }) {
  const { user } = useAuth(); // Ci serve per il tenant_id
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dati dinamici per le categorie operatore
  const [categories, setCategories] = useState([]); 
  const [loadingCats, setLoadingCats] = useState(false);

  // Stati Form (Create/Edit)
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [opName, setOpName] = useState('');
  const [opSurname, setOpSurname] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opPassword, setOpPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null); // Ora è un oggetto {id, label}
  
  const [catModalVisible, setCatModalVisible] = useState(false);

  const fetchOperators = async () => {
    setLoading(true);
    const data = await getOperators();
    setOperators(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
      setLoadingCats(true);
      try {
          // FIX: Prende le categorie operatore
          const cats = await getOperatorCategories();
          setCategories(cats || []);
      } catch (e) {
          console.error("Errore fetch categorie operatori", e);
      } finally {
          setLoadingCats(false);
      }
  };

  useEffect(() => {
    fetchOperators();
    fetchCategories();
  }, []);

  // Apre il form in modalità Creazione
  const openCreateMode = () => {
      setIsEditing(false);
      setEditingId(null);
      setOpName(''); setOpSurname(''); setOpEmail(''); setOpPassword(''); setSelectedCategory(null);
      setModalFormVisible(true);
  };

  // Apre il form in modalità Modifica
  const openEditMode = (op) => {
      setIsEditing(true);
      setEditingId(op.id);
      setOpName(op.name || '');
      setOpSurname(op.surname || '');
      setOpEmail(op.email || '');
      setOpPassword(''); 
      // Cerca la categoria attuale dell'operatore per preselezionarla
      const catObj = categories.find(c => c.label === op.category) || null;
      setSelectedCategory(catObj);
      setModalFormVisible(true);
  };

  const handleSave = async () => {
    if (!opName || !opEmail || (!isEditing && !opPassword) || !selectedCategory) {
      Alert.alert("Errore", "Compila i campi obbligatori (Nome, Email, Password, Categoria).");
      return;
    }

    setActionLoading(true);

    try {
        if (isEditing) {
            // 1. Aggiorna dati anagrafici base
            const updateData = { name: opName, surname: opSurname, email: opEmail };
            if (opPassword) updateData.password = opPassword;
            const updated = await updateOperator(editingId, updateData);
            
            // 2. Aggiorna Mappatura Categoria (se andata a buon fine l'anagrafica)
            if (updated) {
                await assignOperatorCategory(editingId, user.tenant_id, selectedCategory.id);
                Alert.alert("Successo", "Operatore aggiornato!");
                setModalFormVisible(false);
                fetchOperators();
            } else {
                Alert.alert("Errore", "Impossibile aggiornare i dati dell'operatore.");
            }
        } else {
            // CREAZIONE
            const newOpData = {
              name: opName,
              surname: opSurname,
              email: opEmail,
              password: opPassword
            };

            const result = await createOperator(newOpData);
            
            if (result.success && result.id) {
                // Assegna la categoria al nuovo operatore creato
                const mapped = await assignOperatorCategory(result.id, user.tenant_id, selectedCategory.id);
                if (mapped) {
                    Alert.alert("Successo", "Operatore creato e assegnato con successo!");
                    setModalFormVisible(false);
                    fetchOperators();
                } else {
                    Alert.alert("Attenzione", "Operatore creato, ma c'è stato un errore nell'assegnare la categoria.");
                }
            } else {
                Alert.alert("Errore", "Impossibile creare l'operatore.");
            }
        }
    } catch (e) {
        Alert.alert("Errore", "Si è verificato un errore di rete.");
    } finally {
        setActionLoading(false);
    }
  };

  const handleDelete = (op) => {
      Alert.alert(
          "Elimina Operatore", 
          `Sei sicuro di voler eliminare ${op.name} ${op.surname}?`,
          [
              { text: "Annulla", style: "cancel" },
              { text: "Elimina", style: 'destructive', onPress: async () => {
                  setLoading(true);
                  const success = await deleteUser(op.id);
                  if (success) {
                      Alert.alert("Eliminato", "Operatore rimosso.");
                      fetchOperators();
                  } else {
                      setLoading(false);
                      Alert.alert("Errore", "Impossibile eliminare l'operatore.");
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
             <Text style={styles.opEmail}>{item.email}</Text>
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Elenco Operatori</Text>
        <TouchableOpacity onPress={openCreateMode} style={styles.addBtnHeader}>
            <Ionicons name="add" size={24} color="white" />
            <Text style={{color:'white', fontWeight:'bold', marginLeft:5}}>Nuovo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary || '#007BFF'} style={{marginTop:20}} />
      ) : (
          <FlatList 
            data={operators} 
            keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()} 
            renderItem={renderItem}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#666'}}>Nessun operatore presente.</Text>}
            contentContainerStyle={{paddingBottom: 20}}
          />
      )}

      {/* MODALE FORM CREAZIONE / MODIFICA */}
      <Modal visible={modalFormVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{isEditing ? "Modifica Operatore" : "Nuovo Operatore"}</Text>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>Nome *</Text>
                    <TextInput style={styles.input} value={opName} onChangeText={setOpName} placeholder="Nome" />
                    
                    <Text style={styles.label}>Cognome</Text>
                    <TextInput style={styles.input} value={opSurname} onChangeText={setOpSurname} placeholder="Cognome" />
                    
                    <Text style={styles.label}>Email *</Text>
                    <TextInput style={styles.input} value={opEmail} onChangeText={setOpEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
                    
                    <Text style={styles.label}>{isEditing ? "Nuova Password (opzionale)" : "Password *"}</Text>
                    <TextInput style={styles.input} value={opPassword} onChangeText={setOpPassword} placeholder="Password" secureTextEntry />
                    
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
                            {actionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnTextSave}>Salva</Text>}
                        </TouchableOpacity>
                    </View>
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* MODALE SELEZIONE CATEGORIA */}
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
  container: { flex: 1, padding: 16, backgroundColor: COLORS.bg || '#F5F5F5' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary || '#007BFF' },
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
  
  formButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#E0E0E0' },
  btnSave: { backgroundColor: COLORS.primary || '#007BFF' },
  btnTextCancel: { color: '#333', fontWeight: 'bold' },
  btnTextSave: { color: 'white', fontWeight: 'bold' },

  catOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection:'row', justifyContent:'space-between' },
  catOptionText: { fontSize: 16, color: '#333' }
});