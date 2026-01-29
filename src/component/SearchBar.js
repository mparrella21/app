import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar({ value, onChange, onSearch }) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#444" />
      <TextInput
        style={styles.input}
        placeholder="Cerca una zona o un ticket..."
        placeholderTextColor="#444"
        value={value}
        onChangeText={onChange}
        onSubmitEditing={() => onSearch && onSearch(value)}
        returnKeyType="search"
      />
      <TouchableOpacity onPress={() => onSearch && onSearch(value)} style={styles.searchBtn}>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 6
  },
  searchBtn: { backgroundColor: '#009BD9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: -6 }
});