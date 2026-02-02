import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import { useAuth } from '../context/AuthContext';
import { register, login as loginApi } from '../services/authService'; 
import { searchTenantByCoordinates } from '../services/tenantService';

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const { setDirectLogin } = useAuth(); 
  const [activeTab, setActiveTab] = useState('login'); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [birthDate, setBirthDate] = useState(''); // NUOVO CAMPO
  const [cellulare, setCellulare] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getTenantFromLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permessi negati", "Abbiamo bisogno della posizione per identificare il tuo Comune.");
        return null;
      }

      let location = await Location.getCurrentPositionAsync({});
      const result = await searchTenantByCoordinates(location.coords.latitude, location.coords.longitude);
      
      if (result && result.tenant && result.tenant.id) {
        return result.tenant.id;
      } else {
        Alert.alert("Zona non coperta", `La tua posizione non è associata a un Comune gestito.`);
        return null;
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Errore Posizione", "Impossibile determinare il Comune dalla posizione.");
      return null;
    }
  };

  const handleAuthAction = async () => {
    setIsLoading(true);
    
    // 1. Recupero Tenant ID dinamico
    const currentTenantId = await getTenantFromLocation();
    if (!currentTenantId) {
      setIsLoading(false);
      return;
    }

    try {
        if (activeTab === 'login') {
            if (!email || !password) {
                Alert.alert("Errore", "Email e Password sono obbligatori.");
                setIsLoading(false);
                return;
            }
            
            // Login: Ora inviamo solo ciò che serve (email, pass, tenant)
            const result = await loginApi(email, password, currentTenantId);
            
            if (result.success) {
                 if (result.token && result.user) {
                    await setDirectLogin(result.token, result.user);
                 }
                 navigation.goBack(); 
            } else {
                 Alert.alert("Errore Login", result.error || "Credenziali non valide");
            }

        } else {
            // Registrazione
            // Controllo campi obbligatori (inclusa data nascita)
            if (!nome || !cognome || !email || !password || !cellulare || !birthDate) {
                Alert.alert("Errore", "Compila tutti i campi, inclusa la data di nascita.");
                setIsLoading(false);
                return;
            }
            
            // Validazione formato data (semplice)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(birthDate)) {
                Alert.alert("Errore Data", "La data deve essere nel formato AAAA-MM-GG (es. 2002-07-08)");
                setIsLoading(false);
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert("Errore", "Le password non coincidono");
                setIsLoading(false);
                return;
            }

            const userData = {
                tenant_id: currentTenantId,
                name: nome,
                surname: cognome,
                email: email,
                password: password,
                phoneNumber: cellulare,
                birth_date: birthDate // Inviamo la data
            };

            const result = await register(userData);

            if (result.success) {
                if (result.token && result.user) {
                    await setDirectLogin(result.token, result.user);
                    navigation.goBack();
                } else {
                    Alert.alert("Successo", "Account creato! Ora puoi accedere.");
                    setActiveTab('login');
                }
            } else {
                Alert.alert("Errore Registrazione", result.error);
            }
        }
    } catch (e) {
        Alert.alert("Errore", "Problema tecnico durante l'autenticazione.");
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.card, activeTab === 'register' && { height: '90%' }]}>
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
              
              {/* CAMPI SOLO REGISTRAZIONE */}
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

                    {/* NUOVO INPUT DATA DI NASCITA */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="calendar-outline" size={20} color="#666" style={{marginRight:10}} />
                        <TextInput 
                            placeholder="Data Nascita (AAAA-MM-GG)" 
                            style={styles.input} 
                            value={birthDate} 
                            onChangeText={setBirthDate} 
                            placeholderTextColor="#999"
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#666" style={{marginRight:10}} />
                        <TextInput 
                            placeholder="Cellulare" 
                            keyboardType="phone-pad" 
                            style={styles.input} 
                            value={cellulare} 
                            onChangeText={setCellulare} 
                            placeholderTextColor="#999"
                        />
                    </View>
                  </>
              )}

              {/* CAMPI LOGIN e REGISTRAZIONE */}
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

              {/* CONFERMA PASSWORD SOLO REGISTRAZIONE */}
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

              {/* Bottone Azione */}
              <TouchableOpacity style={[styles.mainBtn, isLoading && {backgroundColor:'#888'}]} onPress={handleAuthAction} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.mainBtnText}>
                        {activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}
                    </Text>
                )}
              </TouchableOpacity>
              
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
  card: { width: width * 0.9, backgroundColor: '#467599', borderRadius: 15, padding: 25, elevation: 10, maxHeight: '95%' }, // aumentata altezza
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
});