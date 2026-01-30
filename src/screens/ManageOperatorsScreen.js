import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { useAuth } from '../context/AuthContext';

// Mock data temporaneo (sostituire con chiamata API in futuro)
const MOCK_OPERATORS = [
  { id: '1', name: 'Mario Rossi', email: 'mario.rossi@operatore.it' },
  { id: '2', name: 'Luigi Verdi', email: 'luigi.verdi@operatore.it' },
];

export default function ManageOperatorsScreen({ navigation }) {
  const [operators, setOperators] = useState([]);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Qui andrebbe la fetch API: GET /api/operators
    setOperators(MOCK_OPERATORS);
  }, []);

  const handleAddOperator = () => {
    if (!newOpName || !newOpEmail) {
      Alert.alert("Errore", "Compila tutti i campi");
      return;
    }
    // Qui andrebbe la fetch API: POST /api/operators
    const newOp = {
      id: Math.random().toString(), 
      name: newOpName, 
      email: newOpEmail 
    };
    setOperators([...operators, newOp]);
    setNewOpName('');
    setNewOpEmail('');
    setIsAdding(false);
  };

  const handleDeleteOperator = (id) => {
    Alert.alert(
      "Conferma",
      "Vuoi davvero eliminare questo operatore?",
      [
        { text: "Annulla", style: "cancel" },
        { 
          text: "Elimina", 
          style: "destructive",
          onPress: () => {
            // Qui andrebbe la fetch API: DELETE /api/operators/{id}
            setOperators(prev => prev.filter(op => op.id !== id));
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Elenco Operatori</Text>
        <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
            <Ionicons name={isAdding ? "remove-circle" : "add-circle"} size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.addBox}>
          <Text style={styles.subTitle}>Nuovo Operatore</Text>
          <TextInput 
            placeholder="Nome e Cognome" 
            style={styles.input} 
            value={newOpName} 
            onChangeText={setNewOpName} 
          />
          <TextInput 
            placeholder="Email" 
            style={styles.input} 
            autoCapitalize="none"
            value={newOpEmail} 
            onChangeText={setNewOpEmail} 
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAddOperator}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>SALVA</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList 
        data={operators} 
        keyExtractor={item => item.id} 
        renderItem={({item}) => (
          <View style={styles.card}>
            <View>
                <Text style={styles.opName}>{item.name}</Text>
                <Text style={styles.opEmail}>{item.email}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteOperator(item.id)}>
                <Ionicons name="trash-outline" size={24} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>Nessun operatore trovato.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  subTitle: { fontWeight: 'bold', marginBottom: 8, color: '#333' },
  addBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  input: { backgroundColor: '#f0f0f0', borderRadius: 6, padding: 10, marginBottom: 10 },
  saveBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 6, alignItems: 'center' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  opName: { fontWeight: '700', fontSize: 16 },
  opEmail: { color: '#666', fontSize: 14 }
});