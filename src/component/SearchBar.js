import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DUMMY_LOCATIONS = [
  { id: '1', name: 'Roma, Centro' },
  { id: '2', name: 'Milano, Duomo' },
  { id: '3', name: 'Napoli, Centro' },
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
    if (onLocationSelect) onLocationSelect(item);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Cerca zona..."
          value={query}
          onChangeText={handleSearch}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

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
  container: { zIndex: 100, position: 'relative' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#F9FAFB', // Bianco sporco/grigio chiarissimo
    borderRadius: 6, // Angoli meno stondati come input web
    paddingHorizontal: 10, height: 40,
  },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  resultsList: {
    position: 'absolute', top: 45, left: 0, right: 0,
    backgroundColor: 'white', borderRadius: 6, paddingVertical: 5,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  resultText: { fontSize: 13, color: '#374151' },
});