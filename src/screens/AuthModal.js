import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // Importiamo il context

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const { login } = useAuth(); // Prendiamo la funzione login
  const [activeTab, setActiveTab] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    // Chiama il login finto e poi chiude la modale
    login(email); 
    navigation.goBack(); 
  };

  // Funzioni rapide per testare i ruoli (Simulazione)
  const quickLogin = (roleEmail) => {
    login(roleEmail);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
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
              <TouchableOpacity 
                style={[styles.toggleItem, activeTab === 'login' && styles.toggleItemActive]}
                onPress={() => setActiveTab('login')}
              >
                <Text style={styles.toggleText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleItem, activeTab === 'register' && styles.toggleItemActive]}
                onPress={() => setActiveTab('register')}
              >
                <Text style={styles.toggleText}>Registrati</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.iconWrapper}>
              <Ionicons name="person-circle" size={60} color="white" />
              <Text style={styles.title}>Accedi a Civitas</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color="#4A769E" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Email (es. admin@test.it)"
                  style={styles.input}
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#4A769E" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Password"
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit}>
                <Text style={styles.mainBtnText}>ACCEDI</Text>
              </TouchableOpacity>

              {/* SEZIONE DEBUG PER TESTARE I RUOLI VELOCEMENTE */}
              <Text style={{color:'rgba(255,255,255,0.5)', textAlign:'center', marginTop:15, fontSize:12}}>
                --- TEST RAPIDO (Simulazione) ---
              </Text>
              <View style={{flexDirection:'row', justifyContent:'space-around', marginTop:10}}>
                <TouchableOpacity onPress={() => quickLogin('operatore@test.it')}>
                  <Text style={{color:'#81C784', fontWeight:'bold'}}>Operatore</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => quickLogin('admin@test.it')}>
                  <Text style={{color:'#E57373', fontWeight:'bold'}}>Responsabile</Text>
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
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { position: 'absolute', width: '100%', height: '100%' },
  card: { width: width * 0.85, backgroundColor: '#4A769E', borderRadius: 20, padding: 20, elevation: 10 },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleItemActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleText: { color: 'white', fontWeight: 'bold' },
  iconWrapper: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: 'white', marginTop: 5 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, marginBottom: 12, paddingHorizontal: 10, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#1D2D44', fontSize: 16 },
  mainBtn: { backgroundColor: '#1D2D44', borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});