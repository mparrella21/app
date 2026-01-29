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

  const handleSubmit = () => {
    login(email); 
    navigation.goBack(); 
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* BOX STILE SITO */}
          <View style={styles.card}>
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

            <View style={{alignItems: 'center', marginBottom: 20}}>
                <Text style={styles.title}>{activeTab === 'login' ? 'Bentornato!' : 'Unisciti a noi'}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={{marginRight:10}} />
                <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none"/>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={{marginRight:10}} />
                <TextInput placeholder="Password" style={styles.input} secureTextEntry value={password} onChangeText={setPassword}/>
              </View>

              <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit}>
                <Text style={styles.mainBtnText}>{activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}</Text>
              </TouchableOpacity>
              
              {/* BOTTONI DEBUG PER MOSTRARE AL PROFESSORE I RUOLI */}
              <View style={{marginTop: 20, alignItems: 'center'}}>
                 <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 5}}>-- SIMULAZIONE RUOLI --</Text>
                 <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity onPress={() => {login('resp@comune.it'); navigation.goBack()}} style={styles.debugBtn}>
                        <Text style={styles.debugText}>Responsabile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {login('operatore@comune.it'); navigation.goBack()}} style={styles.debugBtn}>
                        <Text style={styles.debugText}>Operatore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {login('cittadino@test.it'); navigation.goBack()}} style={styles.debugBtn}>
                        <Text style={styles.debugText}>Cittadino</Text>
                    </TouchableOpacity>
                 </View>
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
  card: { width: width * 0.9, backgroundColor: '#467599', borderRadius: 15, padding: 25, elevation: 10 },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 3, marginBottom: 20 },
  toggleItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: 'white' },
  toggleText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  activeText: { color: '#467599', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, fontSize: 16 },
  mainBtn: { backgroundColor: '#1F2937', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  debugBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginHorizontal: 5 },
  debugText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});