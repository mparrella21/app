import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dati statici per testare la ricerca (simulazione API)
const DUMMY_LOCATIONS = [
  { id: '1', name: 'Roma, Colosseo' },
  { id: '2', name: 'Milano, Piazza Duomo' },
  { id: '3', name: 'Napoli, Spaccanapoli' },
  { id: '4', name: 'Firenze, Ponte Vecchio' },
  { id: '5', name: 'Torino, Mole Antonelliana' },
  { id: '6', name: 'Venezia, Piazza San Marco' },
];

export default function SearchBar({ onLocationSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (text) => {
    setQuery(text);
    if (text.length > 0) {
      const filtered = DUMMY_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const selectResult = (item) => {
    setQuery(item.name);
    setShowResults(false);
    Keyboard.dismiss();
    // Passa il risultato al componente padre (HomeScreen) se necessario
    if (onLocationSelect) {
      onLocationSelect(item);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Input Box */}
      <View style={styles.inputBox}>
        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Cerca zona o via..."
          value={query}
          onChangeText={handleSearch}
          style={styles.input}
          placeholderTextColor="#999"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Risultati (Galleggiante) */}
      {showResults && results.length > 0 && (
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
    // Importante: zIndex alto per stare sopra tutto
    zIndex: 100, 
    position: 'relative',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8, // Squadrato ma morbido come il sito
    paddingHorizontal: 15,
    height: 45,
    // Ombreggiatura stile Material/Sito
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultsList: {
    position: 'absolute', // FONDAMENTALE: Fa galleggiare la lista
    top: 50, // Appare sotto l'input
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
});