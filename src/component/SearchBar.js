import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dati finti per testare la ricerca
const DUMMY_LOCATIONS = [
  { id: '1', name: 'Roma, Centro Storico' },
  { id: '2', name: 'Milano, Duomo' },
  { id: '3', name: 'Napoli, Piazza del Plebiscito' },
  { id: '4', name: 'Torino, Mole Antonelliana' },
];

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Funzione che simula la ricerca
  const handleSearch = (text) => {
    setQuery(text);
    if (text.length > 0) {
      const filtered = DUMMY_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  };

  const selectResult = (item) => {
    setQuery(item.name);
    setResults([]); // Nascondi risultati
    Keyboard.dismiss();
    alert(`Navigazione verso: ${item.name}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Cerca luogo o indirizzo..."
          value={query}
          onChangeText={handleSearch}
          style={styles.input}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista Risultati Dropdown */}
      {results.length > 0 && (
        <View style={styles.resultsList}>
          {results.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.resultItem} 
              onPress={() => selectResult(item)}
            >
              <Ionicons name="location-sharp" size={16} color="#4A769E" style={{ marginRight: 10 }} />
              <Text style={styles.resultText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 20, // Assicura che stia sopra la mappa
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultsList: {
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
});