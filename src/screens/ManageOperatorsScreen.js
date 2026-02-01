import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { getOperators, createOperator, updateOperator, deleteUser } from '../services/userService';
import { getCategories } from '../services/ticketService';

export default function ManageOperatorsScreen({ navigation }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dati dinamici
  const [categories, setCategories] = useState([]); 
  const [loadingCats, setLoadingCats] = useState(false);

  // Stati Form (Create/Edit)
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [opName, setOpName] = useState('');
  const [opSurname, setOpSurname] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opPassword, setOpPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
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
          const cats = await getCategories();
          const normalized = cats.map(c => (typeof c === 'object' ? c.label : c));
          setCategories(normalized);
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
      setOpName(''); setOpSurname(''); setOpEmail(''); setOpPassword(''); setSelectedCategory('');
      setModalFormVisible(true);
  };

  // Apre il form in modalità Modifica (UC-12)
  const openEditMode = (op) => {
      setIsEditing(true);
      setEditingId(op.id);
      setOpName(op.name || '');
      setOpSurname(op.surname || '');
      setOpEmail(op.email || '');
      setOpPassword(''); // La password si lascia vuota se non la si vuole cambiare
      setSelectedCategory(op.category || '');
      setModalFormVisible(true);
  };

  const handleSave = async () => {
    // Validazione base
    if (!opName || !opEmail || (!isEditing && !opPassword) || !selectedCategory) {
      Alert.alert("Errore", "Compila i campi obbligatori (Nome, Email, Password, Categoria).");
      return;
    }

    const operatorData = {
      name: opName,
      surname: opSurname || '',
      email: opEmail,
      category: selectedCategory,
      role: 'Operatore'
    };

    // Se stiamo creando o se l'utente ha inserito una nuova password in modifica
    if (opPassword) {
        operatorData.password = opPassword;
    }

    let success = false;
    if (isEditing) {
        success = await updateOperator(editingId, operatorData);
    } else {
        success = await createOperator(operatorData);
    }
    
    if (success) {
      Alert.alert("Successo", isEditing ? "Operatore aggiornato!" : "Operatore creato!");
      setModalFormVisible(false);
      fetchOperators();
    } else {
      Alert.alert("Errore", "Operazione fallita. Verifica i dati o la connessione.");
    }
  };

  const handleDelete = (op) => {
      Alert.alert(
          "Elimina Operatore", 
          `Sei sicuro di voler eliminare ${op.name} ${op.surname}?`,
          [
              { text: "Annulla", style: "cancel" },
              { text: "Elimina", style: 'destructive', onPress: async () => {
                  const success = await deleteUser(op.id);
                  if (success) {
                      Alert.alert("Eliminato", "Operatore rimosso.");
                      fetchOperators();
                  } else {
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
      
      {/* Bottoni Azione */}
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
                    
                    <Text style={styles.label}>Categoria *</Text>
                    <TouchableOpacity style={styles.catSelector} onPress={() => setCatModalVisible(true)}>
                        <Text style={{color: selectedCategory ? '#333' : '#999'}}>
                            {selectedCategory || "Seleziona Categoria..."}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.formButtons}>
                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalFormVisible(false)}>
                            <Text style={styles.btnTextCancel}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                            <Text style={styles.btnTextSave}>Salva</Text>
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
                  ) : (
                    <ScrollView>
                        {categories.map((cat, index) => (
                            <TouchableOpacity key={index} style={styles.catOption} onPress={() => { setSelectedCategory(cat); setCatModalVisible(false); }}>
                                <Text style={styles.catOptionText}>{cat}</Text>
                                {selectedCategory === cat && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
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
  
  // Modale Styles
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