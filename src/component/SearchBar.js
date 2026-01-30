import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim().length > 0 && onSearch) {
      onSearch(query);
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
        {/* Icona Lente: Cliccando esegue la ricerca */}
        <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#6B7280" style={{ marginRight: 8 }} />
        </TouchableOpacity>
        
        <TextInput
          placeholder="Cerca via, comune o zona..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search" // Cambia il tasto invio in "Cerca"
          onSubmitEditing={handleSearch} // Esegue la ricerca all'invio
        />
        
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); }}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', 
    borderRadius: 8,
    paddingHorizontal: 12, height: 45,
    borderWidth: 1, borderColor: '#E5E7EB',
    elevation: 2, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
  },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
});