import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global'; // Assicurati che questo file esista
import { getOperators, createOperator } from '../services/userService';

export default function ManageOperatorsScreen({ navigation }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stati Form
  const [newOpName, setNewOpName] = useState('');
  const [newOpSurname, setNewOpSurname] = useState(''); // Aggiunto cognome per coerenza
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState(''); // Aggiunta password necessaria per creazione
  const [isAdding, setIsAdding] = useState(false);

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
    if (!newOpName || !newOpEmail || !newOpPassword) {
      Alert.alert("Errore", "Compila tutti i campi (Nome, Email, Password)");
      return;
    }

    const newOp = {
      name: newOpName,
      surname: newOpSurname || '', // Opzionale nel form UI, ma utile
      email: newOpEmail,
      password: newOpPassword
    };

    const success = await createOperator(newOp);
    
    if (success) {
      Alert.alert("Successo", "Operatore creato!");
      setNewOpName(''); setNewOpSurname(''); setNewOpEmail(''); setNewOpPassword('');
      setIsAdding(false);
      fetchOperators(); // Ricarica la lista reale
    } else {
      Alert.alert("Errore", "Impossibile creare l'operatore. Verifica i dati.");
    }
  };

  const handleDeleteOperator = (id) => {
    // Nota: Se non hai un endpoint DELETE, questa parte rimarrà solo UI o mockup
    Alert.alert("Info", "Funzionalità eliminazione non ancora disponibile nel backend.");
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
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDeleteOperator(item.id)}>
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
          <TextInput 
            placeholder="Nome" 
            style={styles.input} 
            value={newOpName} 
            onChangeText={setNewOpName} 
          />
           <TextInput 
            placeholder="Cognome" 
            style={styles.input} 
            value={newOpSurname} 
            onChangeText={setNewOpSurname} 
          />
          <TextInput 
            placeholder="Email" 
            style={styles.input} 
            autoCapitalize="none"
            keyboardType="email-address"
            value={newOpEmail} 
            onChangeText={setNewOpEmail} 
          />
          <TextInput 
            placeholder="Password Provvisoria" 
            style={styles.input} 
            secureTextEntry
            value={newOpPassword} 
            onChangeText={setNewOpPassword} 
          />
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
  saveBtn: { backgroundColor: COLORS.primary || '#007BFF', padding: 12, borderRadius: 6, alignItems: 'center' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  opName: { fontWeight: '700', fontSize: 16, color:'#333' },
  opEmail: { color: '#666', fontSize: 14 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center'}
});