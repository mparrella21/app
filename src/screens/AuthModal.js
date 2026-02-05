import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- USIAMO DIRETTAMENTE IL BROWSER ---
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/AuthContext';
import { register, login as loginApi, googleLogin } from '../services/authService'; 

// Importante: gestisce il ritorno dall'autenticazione
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
const { setDirectLogin } = useAuth(); 
  const [activeTab, setActiveTab] = useState('login'); 
  const [isLoading, setIsLoading] = useState(false);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ---------------------------------------------------------
  // LOGIN MANUALE PURO
  // ---------------------------------------------------------
  const handleGoogleManualLogin = async () => {
    setIsLoading(true);
    try {
        // 1. URL DEL PROXY (Deve essere identico a quello su Google Cloud)
        // Nota: Assicurati che su Google Cloud sia scritto in minuscolo: .../civitas
        const proxyURL = "https://auth.expo.io/@m.parrella21/civitas";
        
        // 2. Costruiamo l'URL di Google a mano
        // response_type=token ci dà direttamente l'access_token (più facile da gestire col proxy)
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=802415952838-3cgv2g043mt4onpd791q5lf8bnu8b4fo.apps.googleusercontent.com` +
          `&redirect_uri=${encodeURIComponent(proxyURL)}` +
          `&response_type=token` + 
          `&scope=openid%20profile%20email` +
          `&include_granted_scopes=true` +
          `&state=civitas_auth`;

        console.log("Apro browser...");

        // 3. APRIAMO IL BROWSER (SENZA SECONDO PARAMETRO)
        // Non passiamo proxyURL come secondo argomento. Lasciamo che Expo rilevi
        // automaticamente il ritorno su exp://...
        const result = await WebBrowser.openAuthSessionAsync(authUrl);

        console.log("Risultato Browser:", result);

        if (result.type === 'success' && result.url) {
            // L'URL di ritorno avrà il token nel frammento (#)
            const params = parseUrlParams(result.url);
            
            if (params.access_token) {
                // Abbiamo l'access token! Lo usiamo.
                await fetchUserInfoAndLogin(params.access_token);
            } else if (params.id_token) {
                // Caso raro, ma gestiamo anche l'id_token
                await callBackendWithGoogleToken(params.id_token);
            } else {
                setIsLoading(false);
                Alert.alert("Errore", "Nessun token trovato.");
            }
        } else {
            setIsLoading(false);
            // 'dismiss' è normale se l'utente chiude, non mostriamo errori
            if (result.type !== 'dismiss') {
               Alert.alert("Info", "Login non completato.");
            }
        }
    } catch (error) {
        console.error(error);
        setIsLoading(false);
        Alert.alert("Errore", "Impossibile aprire il browser.");
    }
  };

  // Funzione per estrarre i parametri (token) dall'URL
  const parseUrlParams = (url) => {
    const params = {};
    // Divide l'url all'hash (#) o alla query (?)
    const queryString = url.split('#')[1] || url.split('?')[1];
    if (queryString) {
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
                params[key] = decodeURIComponent(value);
            }
        }
    }
    return params;
  };

  // Ottiene info utente da Google e poi fa login sul tuo backend
  const fetchUserInfoAndLogin = async (accessToken) => {
      try {
          // 1. Chiediamo a Google chi è l'utente
          const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const userInfo = await userInfoResp.json();
          console.log("Google User:", userInfo);

          // 2. Mandiamo il token al tuo backend
          // Nota: Stiamo mandando l'accessToken. Se il tuo backend richiede strettamente un JWT ID Token,
          // potrebbe servire una modifica lato backend, ma spesso accettano entrambi se configurati.
          await callBackendWithGoogleToken(accessToken); 

      } catch (err) {
          console.log("Errore user info:", err);
          setIsLoading(false);
          Alert.alert("Errore", "Impossibile recuperare dati utente.");
      }
  };

  const callBackendWithGoogleToken = async (token) => {
      try {
        console.log("Chiamata backend...");
        const result = await googleLogin(token);
        
        if (result.success) {
            await setDirectLogin(result.token, result.user);
            setIsLoading(false);
            navigation.goBack();
        } else {
            setIsLoading(false);
            console.log("Backend Error:", result);
            Alert.alert("Errore Accesso", "Il server non ha accettato il login.");
        }
      } catch (error) {
          setIsLoading(false);
          Alert.alert("Errore", "Problema di connessione col server.");
      }
  };



  // ---------------------------------------------------------
  // ---------------------------------------------------------
  const handleAuthAction = async () => {
    setIsLoading(true);

    try {
        if (activeTab === 'login') {
            if (!email || !password) {
                Alert.alert("Errore", "Email e Password sono obbligatori.");
                setIsLoading(false);
                return;
            }
            
            // Login classico
            const result = await loginApi(email, password);
            
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
            if (!nome || !cognome || !email || !password || !cellulare || !birthDate) {
                Alert.alert("Errore", "Compila tutti i campi, inclusa la data di nascita.");
                setIsLoading(false);
                return;
            }
            
            // Regex Data
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(birthDate)) {
                Alert.alert("Errore Data", "La data deve essere nel formato AAAA-MM-GG (es. 2002-07-08)");
                setIsLoading(false);
                return;
            }

            // Controllo Password
            if (password !== confirmPassword) {
                Alert.alert("Errore", "Le password non coincidono");
                setIsLoading(false);
                return;
            }

            const userData = {
                name: nome,
                surname: cognome,
                email: email,
                password: password,
                phoneNumber: cellulare,
                birth_date: birthDate
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

              <TouchableOpacity style={[styles.mainBtn, isLoading && {backgroundColor:'#888'}]} onPress={handleAuthAction} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.mainBtnText}>
                        {activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}
                    </Text>
                )}
              </TouchableOpacity>

              {/* TASTO GOOGLE - Modificato per usare il PROXY */}
              {activeTab === 'login' && (
                  <TouchableOpacity 
                      style={styles.googleBtn} 
                      disabled={isLoading} 
                      onPress={() => handleGoogleManualLogin()}
                  >
                      <Ionicons name="logo-google" size={20} color="#4285F4" style={{marginRight: 10}} />
                      <Text style={styles.googleBtnText}>Accedi con Google</Text>
                  </TouchableOpacity>
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
  card: { width: width * 0.9, backgroundColor: '#467599', borderRadius: 15, padding: 25, elevation: 10, maxHeight: '95%' },
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
  googleBtn: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#ddd' },
  googleBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
});