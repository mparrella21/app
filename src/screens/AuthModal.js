import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ScrollView } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); 
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAuthAction = () => {
    if (activeTab === 'login') {
        if (!email || !password) {
            Alert.alert("Errore", "Inserisci Email e Password");
            return;
        }
        login(email); // In futuro passare anche password
        navigation.goBack(); 
    } else {
        // Logica Registrazione
        if (!nome || !cognome || !email || !password || !confirmPassword) {
            Alert.alert("Errore", "Compila tutti i campi obbligatori");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Errore", "Le password non coincidono");
            return;
        }
        Alert.alert("Registrazione", "Account creato con successo! Ora puoi accedere.");
        setActiveTab('login');
    }
  };

  const handleGoogleLogin = () => {
      Alert.alert("Google Login", "Funzionalità simulata. Accesso come Cittadino.");
      login('cittadino.google@test.it');
      navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.card, activeTab === 'register' && { height: '80%' }]}>
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

            <Text style={styles.title}>{activeTab === 'login' ? 'Bentornato!' : 'Crea Account'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
              
              {/* CAMPI REGISTRAZIONE AGGIUNTIVI */}
              {activeTab === 'register' && (
                <>
                  <View style={styles.row}>
                      <View style={[styles.inputContainer, {flex:1, marginRight:5}]}>
                        <Ionicons name="person-outline" size={20} color="#666" style={{marginRight:5}} />
                        <TextInput placeholder="Nome" style={styles.input} value={nome} onChangeText={setNome} placeholderTextColor="#999"/>
                      </View>
                      <View style={[styles.inputContainer, {flex:1, marginLeft:5}]}>
                        <TextInput placeholder="Cognome" style={styles.input} value={cognome} onChangeText={setCognome} placeholderTextColor="#999"/>
                      </View>
                  </View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color="#666" style={{marginRight:10}} />
                    <TextInput placeholder="Cellulare (Opzionale)" keyboardType="phone-pad" style={styles.input} value={cellulare} onChangeText={setCellulare} placeholderTextColor="#999"/>
                  </View>
                </>
              )}

              {/* CAMPI COMUNI (EMAIL/PWD) */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={{marginRight:10}} />
                <TextInput 
                    placeholder="Email" 
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    autoCapitalize="none"
                    keyboardType="email-address"
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

              {activeTab === 'register' && (
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={{marginRight:10}} />
                    <TextInput 
                        placeholder="Conferma Password" 
                        style={styles.input} 
                        secureTextEntry 
                        value={confirmPassword} 
                        onChangeText={setConfirmPassword}
                        placeholderTextColor="#999"
                    />
                  </View>
              )}

              {/* Action Button */}
              <TouchableOpacity style={styles.mainBtn} onPress={handleAuthAction}>
                <Text style={styles.mainBtnText}>{activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}</Text>
              </TouchableOpacity>

              {/* Google Login (SOLO NELLA TAB LOGIN) */}
              {activeTab === 'login' && (
                  <>
                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>oppure</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
                        {/* Google Icon SVG styled or FontAwesome */}
                        <FontAwesome5 name="google" size={18} color="#DB4437" style={{marginRight: 10}} />
                        <Text style={styles.googleBtnText}>Accedi con Google</Text>
                    </TouchableOpacity>

                    {/* Debug Buttons (Solo in Login per pulizia) */}
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                        <TouchableOpacity onPress={() => {setEmail('resp@comune.it'); setPassword('123');}} style={styles.debugBtn}>
                            <Text style={styles.debugText}>Resp.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {setEmail('operatore@comune.it'); setPassword('123');}} style={styles.debugBtn}>
                            <Text style={styles.debugText}>Op.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {setEmail('cittadino@test.it'); setPassword('123');}} style={styles.debugBtn}>
                            <Text style={styles.debugText}>Cittadino</Text>
                        </TouchableOpacity>
                    </View>
                  </>
              )}
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdrop: { position: 'absolute', width: '100%', height: '100%' },
  card: { width: width * 0.9, backgroundColor: '#467599', borderRadius: 15, padding: 25, elevation: 10, maxHeight: '90%' },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 3, marginBottom: 20 },
  toggleItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: 'white' },
  toggleText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  activeText: { color: '#467599', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 },
  form: { width: '100%' },
  row: { flexDirection: 'row' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  mainBtn: { backgroundColor: '#1F2937', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  mainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  googleBtn: { backgroundColor: 'white', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10, flexDirection: 'row' },
  googleBtnText: { color: '#1F2937', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  orText: { color: 'rgba(255,255,255,0.8)', marginHorizontal: 10, fontSize: 12 },
  debugBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 5 },
  debugText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});