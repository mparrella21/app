import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { getOperators, createOperator } from '../services/userService';

// Categorie disponibili (Mockup o da backend)
const CATEGORIES = ["Strade", "Verde Pubblico", "Illuminazione", "Rifiuti", "Edifici", "Idrico"];

export default function ManageOperatorsScreen({ navigation }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stati Form
  const [newOpName, setNewOpName] = useState('');
  const [newOpSurname, setNewOpSurname] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // AGGIUNTA
  const [isAdding, setIsAdding] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false); // AGGIUNTA

  const fetchOperators = async () => {
    setLoading(true);
    const data = await getOperators();
    setOperators(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleAddOperator = async () => {
    // Validazione estesa alla Categoria
    if (!newOpName || !newOpEmail || !newOpPassword || !selectedCategory) {
      Alert.alert("Errore", "Compila tutti i campi, inclusa la Categoria.");
      return;
    }

    const newOp = {
      name: newOpName,
      surname: newOpSurname || '',
      email: newOpEmail,
      password: newOpPassword,
      category: selectedCategory // Invio al backend
    };

    const success = await createOperator(newOp);
    
    if (success) {
      Alert.alert("Successo", "Operatore creato!");
      setNewOpName(''); setNewOpSurname(''); setNewOpEmail(''); setNewOpPassword(''); setSelectedCategory('');
      setIsAdding(false);
      fetchOperators();
    } else {
      Alert.alert("Errore", "Impossibile creare l'operatore. Verifica i dati.");
    }
  };

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={{flexDirection:'row', alignItems:'center'}}>
        <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={20} color="#fff" />
        </View>
        <View style={{marginLeft: 10}}>
             <Text style={styles.opName}>{item.name} {item.surname}</Text>
             <Text style={styles.opEmail}>{item.email}</Text>
             {/* Visualizzazione Categoria */}
             {item.category && <Text style={styles.opCat}>Categoria: {item.category}</Text>}
        </View>
      </View>
      <TouchableOpacity onPress={() => Alert.alert("Info", "Eliminazione non implementata.")}>
          <Ionicons name="trash-outline" size={24} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Elenco Operatori</Text>
        <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
            <Ionicons name={isAdding ? "remove-circle" : "add-circle"} size={32} color={COLORS.primary || '#007BFF'} />
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.addBox}>
          <Text style={styles.subTitle}>Nuovo Operatore</Text>
          <TextInput placeholder="Nome" style={styles.input} value={newOpName} onChangeText={setNewOpName} />
          <TextInput placeholder="Cognome" style={styles.input} value={newOpSurname} onChangeText={setNewOpSurname} />
          <TextInput placeholder="Email" style={styles.input} autoCapitalize="none" keyboardType="email-address" value={newOpEmail} onChangeText={setNewOpEmail} />
          <TextInput placeholder="Password Provvisoria" style={styles.input} secureTextEntry value={newOpPassword} onChangeText={setNewOpPassword} />
          
          {/* SELETTORE CATEGORIA */}
          <TouchableOpacity style={styles.catSelector} onPress={() => setCatModalVisible(true)}>
             <Text style={{color: selectedCategory ? '#333' : '#999'}}>
                 {selectedCategory || "Seleziona Categoria..."}
             </Text>
             <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddOperator}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>SALVA</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary || '#007BFF'} />
      ) : (
          <FlatList 
            data={operators} 
            keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()} 
            renderItem={renderItem}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>Nessun operatore trovato.</Text>}
            contentContainerStyle={{paddingBottom: 20}}
          />
      )}

      {/* MODALE CATEGORIA */}
      <Modal visible={catModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Scegli Categoria</Text>
                  <ScrollView>
                      {CATEGORIES.map(cat => (
                          <TouchableOpacity key={cat} style={styles.catOption} onPress={() => { setSelectedCategory(cat); setCatModalVisible(false); }}>
                              <Text style={styles.catOptionText}>{cat}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setCatModalVisible(false)}>
                      <Text style={{color: 'red'}}>Annulla</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: COLORS.primary || '#007BFF' },
  subTitle: { fontWeight: 'bold', marginBottom: 8, color: '#333' },
  addBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  input: { backgroundColor: '#f0f0f0', borderRadius: 6, padding: 10, marginBottom: 10 },
  catSelector: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6, marginBottom: 15 },
  saveBtn: { backgroundColor: COLORS.primary || '#007BFF', padding: 12, borderRadius: 6, alignItems: 'center' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  opName: { fontWeight: '700', fontSize: 16, color:'#333' },
  opEmail: { color: '#666', fontSize: 14 },
  opCat: { color: '#007BFF', fontSize: 12, marginTop: 2 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center'},
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '60%', backgroundColor: 'white', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  catOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catOptionText: { fontSize: 16 },
  modalClose: { marginTop: 15, alignItems: 'center' }
});