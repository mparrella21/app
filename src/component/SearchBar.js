import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Cerca via o zona..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
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
    backgroundColor: '#F9FAFB', // Input chiaro su header scuro
    borderRadius: 6,
    paddingHorizontal: 10, height: 40,
  },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
});