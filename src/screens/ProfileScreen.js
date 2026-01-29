import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profilo</Text>
      <Text style={styles.row}><Text style={styles.label}>Nome: </Text>{user?.name || '-'}</Text>
      <Text style={styles.row}><Text style={styles.label}>Email: </Text>{user?.email || '-'}</Text>
      <Text style={styles.row}><Text style={styles.label}>Ruolo: </Text>{user?.role || '-'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor: COLORS.bg },
  title: { fontSize:22, fontWeight:'800', color: COLORS.primary, marginBottom:12 },
  row: { marginBottom:8 },
  label: { fontWeight:'700' }
});