import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerLocal } = useAuth();

  const handleRegister = async () => {
    setLoading(true);
    const res = await registerLocal(name || 'Utente Test');
    setLoading(false);

    if (res && res.success) {
      Alert.alert('Registrazione', 'Registrazione locale avvenuta. Sei connesso.');
      navigation.navigate('CitizenHome');
    } else {
      Alert.alert('Errore', 'Registrazione locale fallita');
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.box}>
        <Text style={styles.title}>Registrati</Text>

        <View style={styles.formRow}>
          <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
        </View>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.submit} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Registrati</Text>}
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  box: { width: '90%', maxWidth: 540, padding: 24, backgroundColor: COLORS.mid, borderRadius: 12 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 12 },
  formRow: { width: '100%', marginBottom: 8 },
  input: { backgroundColor: COLORS.light, padding: 12, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: COLORS.primary },
  submit: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: COLORS.light, fontSize: 16, fontWeight: '700' }
});