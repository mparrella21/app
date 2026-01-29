import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateTicketScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Strade');

  const handleSubmit = () => {
    if (!title) return alert("Inserisci almeno un titolo!");
    // Qui andrebbe la chiamata API
    alert("Segnalazione inviata! Grazie per il tuo contributo.");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        
        {/* HEADER MODALE */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#1D2D44" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuova Segnalazione</Text>
          <View style={{width:28}} />
        </View>

        <ScrollView contentContainerStyle={styles.formContainer}>
          
          {/* UPLOAD FOTO (FINTO) */}
          <TouchableOpacity style={styles.photoBox} onPress={() => alert('Apertura Fotocamera...')}>
            <Ionicons name="camera-outline" size={40} color="#4A769E" />
            <Text style={styles.photoText}>Scatta o carica una foto</Text>
          </TouchableOpacity>

          <Text style={styles.label}>TITOLO PROBLEMA</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Es. Buca profonda" 
            value={title} onChangeText={setTitle} 
          />

          <Text style={styles.label}>CATEGORIA</Text>
          <View style={styles.chipsRow}>
            {['Strade', 'Illuminazione', 'Verde', 'Rifiuti', 'Altro'].map(cat => (
               <TouchableOpacity 
                 key={cat} 
                 style={[styles.chip, category === cat && styles.chipActive]}
                 onPress={() => setCategory(cat)}
               >
                 <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
               </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DESCRIZIONE DETTAGLIATA</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Descrivi cosa vedi..." 
            multiline numberOfLines={4}
            value={desc} onChangeText={setDesc} 
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#1D2D44" />
            <Text style={styles.infoText}>La posizione verrà rilevata automaticamente dal GPS del dispositivo.</Text>
          </View>

        </ScrollView>

        {/* FOOTER ACTION */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>INVIA SEGNALAZIONE</Text>
            <Ionicons name="send" size={18} color="white" style={{marginLeft: 10}} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1D2D44' },
  formContainer: { padding: 20 },
  photoBox: { height: 160, backgroundColor: '#E9ECEF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E0', marginBottom: 25 },
  photoText: { marginTop: 10, color: '#6C757D', fontWeight: '500' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#6C757D', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#DEE2E6', marginBottom: 20, color: '#1D2D44' },
  textArea: { height: 120, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#DEE2E6', marginRight: 10, marginBottom: 10 },
  chipActive: { backgroundColor: '#1D2D44', borderColor: '#1D2D44' },
  chipText: { color: '#495057', fontSize: 14 },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 8, alignItems: 'center' },
  infoText: { marginLeft: 10, color: '#0D47A1', fontSize: 13, flex: 1 },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  submitBtn: { backgroundColor: '#D32F2F', borderRadius: 10, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});