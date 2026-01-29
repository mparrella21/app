import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Funzione che gestisce il login vero e proprio
  const handleLoginAction = (emailInput) => {
    if (!emailInput) {
        alert("Inserisci un'email valida");
        return;
    }
    login(emailInput); // Aggiorna lo stato globale
    navigation.goBack(); // Chiude la modale e mostra la Home loggata
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            {/* Toggle Header */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity style={[styles.toggleItem, activeTab === 'login' && styles.activeTab]} onPress={() => setActiveTab('login')}>
                <Text style={[styles.toggleText, activeTab === 'login' && styles.activeText]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleItem, activeTab === 'register' && styles.activeTab]} onPress={() => setActiveTab('register')}>
                <Text style={[styles.toggleText, activeTab === 'register' && styles.activeText]}>Registrati</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{activeTab === 'login' ? 'Bentornato!' : 'Unisciti a noi'}</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={{marginRight:10}} />
                <TextInput 
                    placeholder="Email" 
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={{marginRight:10}} />
                <TextInput 
                    placeholder="Password" 
                    style={styles.input} 
                    secureTextEntry 
                    value={password} 
                    onChangeText={setPassword}
                    placeholderTextColor="#999"
                />
              </View>

              {/* Tasto Login Principale */}
              <TouchableOpacity style={styles.mainBtn} onPress={() => handleLoginAction(email)}>
                <Text style={styles.mainBtnText}>{activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>oppure accesso rapido (Demo)</Text>
                  <View style={styles.line} />
              </View>
              
              {/* Bottoni Debug Rapidi */}
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                 <TouchableOpacity onPress={() => handleLoginAction('resp@comune.it')} style={styles.debugBtn}>
                    <Text style={styles.debugText}>Responsabile</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleLoginAction('operatore@comune.it')} style={styles.debugBtn}>
                    <Text style={styles.debugText}>Operatore</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleLoginAction('cittadino@test.it')} style={styles.debugBtn}>
                    <Text style={styles.debugText}>Cittadino</Text>
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdrop: { position: 'absolute', width: '100%', height: '100%' },
  // COLORE ESATTO DEL SITO: #467599 (Blu Carta da Zucchero)
  card: { width: width * 0.9, backgroundColor: '#467599', borderRadius: 15, padding: 25, elevation: 10 },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 3, marginBottom: 20 },
  toggleItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: 'white' },
  toggleText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  activeText: { color: '#467599', fontWeight: 'bold' }, // Testo attivo blu come il box
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  // COLORE BOTTONE: #1F2937 (Blu Scuro Navbar)
  mainBtn: { backgroundColor: '#1F2937', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  orText: { color: 'rgba(255,255,255,0.8)', marginHorizontal: 10, fontSize: 12 },
  debugBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 5 },
  debugText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});