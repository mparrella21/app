import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginLocal, registerLocal } = useAuth();

  const doLogin = async () => {
    setLoading(true);
    const res = await loginLocal('Utente Test', 'cittadino');
    setLoading(false);

    if (res.success) {
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'CitizenHome' }] });
    } else {
      Alert.alert('Errore', 'Impossibile effettuare il login locale');
    }
  };

  const doRegister = async () => {
    setLoading(true);
    const res = await registerLocal(name || 'Utente Test');
    setLoading(false);
    if (res.success) {
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'CitizenHome' }] });
    } else {
      Alert.alert('Errore', 'Impossibile registrarsi localmente');
    }
  };

  const handleGoogle = () => {
    Alert.alert('Google Sign-In', 'Placeholder: apriremo il flusso Google (non configurato)');
  };

  return (
    <View style={styles.page}>
      <View style={styles.box}>
        {/* Tabs like website */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]} onPress={() => setMode('login')}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Accedi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]} onPress={() => setMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrati</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{mode === 'login' ? 'Accesso' : 'Registrazione'}</Text>

        <View style={styles.form}>
          {mode === 'register' && <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />}
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

          <TouchableOpacity style={styles.submit} onPress={mode === 'login' ? doLogin : doRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{mode === 'login' ? 'Login' : 'Registrati'}</Text>}
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.googleContainer} onPress={handleGoogle}>
            <Text style={styles.googleText}>Accedi con Google</Text>
          </TouchableOpacity>

          {/* Quick login per testing ruoli */}
          <View style={{marginTop:12, flexDirection:'row', justifyContent:'space-between'}}>
            <TouchableOpacity style={[styles.googleContainer,{flex:1,marginRight:6,alignItems:'center'}]} onPress={async ()=>{setLoading(true); const res = await loginLocal('Utente Test','cittadino'); setLoading(false); if (res.success) navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'CitizenHome' }] }); else Alert.alert('Errore');}}>
              <Text style={{color:COLORS.primary}}>Accedi come Cittadino</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.googleContainer,{flex:1,marginLeft:6,alignItems:'center'}]} onPress={async ()=>{setLoading(true); const res = await loginLocal('Operatore Test','operatore'); setLoading(false); if (res.success) navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'OperatorTickets' }] }); else Alert.alert('Errore');}}>
              <Text style={{color:COLORS.primary}}>Accedi come Operatore</Text>
            </TouchableOpacity>
          </View>

          <View style={{marginTop:8}}>
            <TouchableOpacity style={[styles.googleContainer,{alignItems:'center'}]} onPress={async ()=>{setLoading(true); const res = await loginLocal('Responsabile Test','responsabile'); setLoading(false); if (res.success) navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'ResponsibleTickets' }] }); else Alert.alert('Errore');}}>
              <Text style={{color:COLORS.primary}}>Accedi come Responsabile</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  box: { width: '90%', maxWidth: 500, padding: 24, backgroundColor: COLORS.mid, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 12 },
  tabsRow: { flexDirection: 'row', marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, overflow: 'hidden' },
  tabBtn: { flex: 1, padding: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: '#444', fontWeight: '700' },
  tabTextActive: { color: COLORS.light },
  form: { marginTop: 8 },
  input: { backgroundColor: COLORS.light, padding: 12, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: COLORS.primary },
  submit: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: COLORS.light, fontSize: 16, fontWeight: '700' },
  separator: { borderTopWidth: 2, borderTopColor: COLORS.primary, marginVertical: 16 },
  googleContainer: { backgroundColor: COLORS.light, padding: 12, borderRadius: 10, alignItems: 'center' },
  googleText: { color: COLORS.primary },
  note: { textAlign: 'center', marginTop: 12, color: COLORS.light }
});