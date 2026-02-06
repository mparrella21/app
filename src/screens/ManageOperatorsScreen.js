import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOperatorsByTenant, promoteToOperator, deleteUser, updateProfile } from '../services/userService';
import { getOperatorCategories, assignOperatorCategory, removeOperatorCategory } from '../services/interventionService';
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
  const [targetId, setTargetId] = useState(''); // ID Utente manuale
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
      setTargetId(String(op.id)); // ID visualizzato ma non modificabile
      // Trova l'oggetto categoria basato sull'ID o sulla label
      const catObj = categories.find(c => c.id === op.category_id || c.label === op.category) || null;
      setSelectedCategory(catObj);
      setModalFormVisible(true);
  };

  const handleSave = async () => {
    // Validazione ID (solo in creazione)
    if (!isEditing && !targetId.trim()) {
        Alert.alert("Errore", "Inserisci l'ID dell'utente cittadino.");
        return;
    }
    if (!selectedCategory) {
      Alert.alert("Errore", "Seleziona una categoria per l'operatore (Requisito fondamentale).");
      return;
    }

    setActionLoading(true);

    try {
        if (isEditing) {
            // MODIFICA OPERATORE ESISTENTE (Solo cambio categoria in questo contesto)
            // Prima rimuoviamo la categoria vecchia se necessario, poi mettiamo la nuova.
            // Per semplicità, assegniamo la nuova (l'API potrebbe gestire l'overwrite o richiedere delete prima).
            // Proviamo a sovrascrivere.
            const success = await assignOperatorCategory(editingId, user.tenant_id, selectedCategory.id);
            
            if (success) {
                Alert.alert("Successo", "Categoria operatore aggiornata!");
                setModalFormVisible(false);
                fetchOperators();
            } else {
                Alert.alert("Errore", "Impossibile aggiornare la categoria.");
            }
        } else {
            // PROMOZIONE NUOVO OPERATORE TRAMITE ID
            // 1. Chiamata API promozione + Assegnazione Categoria
            const result = await promoteToOperator(targetId.trim(), user.tenant_id, selectedCategory.id);

            if (result && result.success) {
                Alert.alert("Successo", `L'utente ID ${targetId} è stato promosso a Operatore (${selectedCategory.label})!`);
                setModalFormVisible(false);
                fetchOperators();
            } else {
                Alert.alert("Errore", result.error || "Impossibile promuovere l'utente. Verifica che l'ID sia corretto.");
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
          "Rimuovi Ruolo", 
          `Revocare i permessi di operatore a ${op.name || 'Utente'} (ID: ${op.id})?`,
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
             <Text style={styles.opEmail}>{item.email || `ID Utente: ${item.id}`}</Text>
             <View style={styles.badgeCat}>
                <Text style={styles.badgeCatText}>{item.category || 'Nessuna Cat.'}</Text>
             </View>
        </View>
      </View>
      
      <View style={{flexDirection:'row'}}>
          <TouchableOpacity onPress={() => openEditMode(item)} style={{padding:8, marginRight:5}}>
              <Ionicons name="settings-outline" size={22} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={{padding:8}}>
             <Ionicons name="trash-outline" size={22} color="#D32F2F" />
          </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:5, marginRight:10}}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Gestione Operatori</Text>
      </View>
      
      <TouchableOpacity onPress={openPromoteMode} style={styles.addBtnBlock}>
            <Ionicons name="person-add" size={20} color="white" />
            <Text style={{color:'white', fontWeight:'bold', marginLeft:10}}>PROMUOVI CITTADINO A OPERATORE</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>
         Operatori attivi nel comune. Assegna le categorie per permettere loro di ricevere i ticket corretti.
      </Text>

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:20}} />
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
                  <Text style={styles.modalTitle}>{isEditing ? "Modifica Categoria" : "Promuovi Utente"}</Text>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    
                    {!isEditing && (
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={24} color="#0056b3" />
                            <Text style={styles.infoText}>
                                Inserisci l'ID Utente del cittadino. L'utente può trovare il suo ID nella sua Area Personale.
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

                    <Text style={styles.label}>Categoria Operatore (Specializzazione) *</Text>
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
                            {actionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnTextSave}>{isEditing ? "Salva" : "Promuovi"}</Text>}
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
                  <Text style={styles.modalTitle}>Scegli Specializzazione</Text>
                  {loadingCats ? (
                      <ActivityIndicator color={COLORS.primary} />
                  ) : categories.length === 0 ? (
                      <Text style={{textAlign:'center', color:'#666'}}>Nessuna categoria disponibile. Creale via API o DB.</Text>
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
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 15 },
  addBtnBlock: { flexDirection:'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems:'center', justifyContent:'center', marginBottom: 20, elevation: 3 },
  
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  opName: { fontWeight: '700', fontSize: 16, color:'#333' },
  opEmail: { color: '#666', fontSize: 13 },
  badgeCat: { backgroundColor: '#E3F2FD', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeCatText: { color: '#1976D2', fontSize: 11, fontWeight: 'bold' },
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
  btnSave: { backgroundColor: COLORS.primary },
  btnTextCancel: { color: '#333', fontWeight: 'bold' },
  btnTextSave: { color: 'white', fontWeight: 'bold' },

  catOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection:'row', justifyContent:'space-between' },
  catOptionText: { fontSize: 16, color: '#333' }
});