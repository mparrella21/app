import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';

export default function EmptyState({ text = "Nessun elemento trovato", icon = "file-tray-outline" }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#CBD5E1" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500'
  }
});