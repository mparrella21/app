import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AuthModal({ navigation }) {
  const [activeTab, setActiveTab] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 

  const handleBackgroundPress = () => {
    navigation.goBack();
  };

  const handleSubmit = () => {
    if (activeTab === 'login') {
      alert(`Login simulato per: ${email}`);
    } else {
      alert(`Registrazione simulata per: ${name}`);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          
          <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleItem, activeTab === 'login' && styles.toggleItemActive]}
                onPress={() => setActiveTab('login')}
              >
                <Text style={[styles.toggleText, activeTab === 'login' && styles.toggleTextActive]}>Login</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toggleItem, activeTab === 'register' && styles.toggleItemActive]}
                onPress={() => setActiveTab('register')}
              >
                <Text style={[styles.toggleText, activeTab === 'register' && styles.toggleTextActive]}>Registrati</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.iconWrapper}>
              <Ionicons 
                name={activeTab === 'login' ? "person-circle" : "person-add"} 
                size={60} 
                color="white" 
              />
              <Text style={styles.title}>
                {activeTab === 'login' ? 'Bentornato!' : 'Unisciti a noi'}
              </Text>
            </View>

            <View style={styles.form}>
              {activeTab === 'register' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#4A769E" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Nome Completo"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color="#4A769E" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Email"
                  style={styles.input}
                  keyboardType="email-address"
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
                <Text style={styles.mainBtnText}>
                  {activeTab === 'login' ? 'ACCEDI' : 'REGISTRATI'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>oppure</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity style={styles.googleBtn} onPress={() => alert('Google Login')}>
                <Ionicons name="logo-google" size={18} color="#DB4437" />
                <Text style={styles.googleBtnText}>Continua con Google</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const COLORS = {
  primary: '#4A769E',
  dark: '#1D2D44',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  card: {
    width: width * 0.85,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    marginTop: 10,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleItemActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 10,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.dark, fontSize: 16 },
  mainBtn: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  mainBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  orText: { color: 'rgba(255,255,255,0.8)', marginHorizontal: 10, fontSize: 12 },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  googleBtnText: { color: '#555', fontWeight: '600', marginLeft: 8 },
});