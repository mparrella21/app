import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ScrollView } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/authService'; // [FIX] Import servizio registrazione

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const { login } = useAuth(); 
  const [activeTab, setActiveTab] = useState('login'); 
  const [isLoading, setIsLoading] = useState(false); // [FIX] Stato caricamento
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAuthAction = async () => {
    setIsLoading(true);
    try {
        if (activeTab === 'login') {
            if (!email || !password) {
                Alert.alert("Errore", "Inserisci Email e Password");
                setIsLoading(false);
                return;
            }
            
            const result = await login(email, password);
            
            if (result.success) {
                 navigation.goBack(); 
            } else {
                 Alert.alert("Errore Login", result.error || "Credenziali non valide");
            }

        } else {
            // [FIX] Logica Registrazione Reale (UC-02)
            if (!nome || !cognome || !email || !password || !confirmPassword) {
                Alert.alert("Errore", "Compila tutti i campi obbligatori");
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert("Errore", "Le password non coincidono");
                setIsLoading(false);
                return;
            }

            // Preparazione payload coerente con User Service
            const userData = {
                name: nome,
                surname: cognome,
                email: email,
                password: password,
                phone: cellulare,
                role: 'Cittadino' // Ruolo di default per registrazione pubblica
            };

            const result = await register(userData);

            if (result.success) {
                Alert.alert("Registrazione", "Account creato con successo! Effettua il login.");
                setActiveTab('login');
                // Pulisci form registrazione se vuoi
                setPassword(''); setConfirmPassword('');
            } else {
                Alert.alert("Errore Registrazione", result.error || "Impossibile creare l'account.");
            }
        }
    } catch (e) {
        Alert.alert("Errore", "Si è verificato un problema tecnico.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
      Alert.alert("Google Login", "Funzionalità non ancora attiva su mobile.");
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
              
              {/* CAMPI REGISTRAZIONE */}
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
                    <TextInput placeholder="Cellulare" keyboardType="phone-pad" style={styles.input} value={cellulare} onChangeText={setCellulare} placeholderTextColor="#999"/>
                  </View>
                </>
              )}

              {/* CAMPI LOGIN/EMAIL */}
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
              <TouchableOpacity style={[styles.mainBtn, isLoading && {backgroundColor:'#888'}]} onPress={handleAuthAction} disabled={isLoading}>
                <Text style={styles.mainBtnText}>
                    {isLoading ? "CARICAMENTO..." : (activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI')}
                </Text>
              </TouchableOpacity>

              {/* Google Login */}
              {activeTab === 'login' && (
                  <>
                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>oppure</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
                        <FontAwesome5 name="google" size={18} color="#DB4437" style={{marginRight: 10}} />
                        <Text style={styles.googleBtnText}>Accedi con Google</Text>
                    </TouchableOpacity>
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
});