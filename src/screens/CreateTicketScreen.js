import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postTicket } from '../services/ticketService'; // Assicurati di aver importato il servizio

export default function CreateTicketScreen({ navigation, route }) {
  // 1. Recupera coordinate dai parametri di navigazione (se inviati dalla Mappa)
  const initialLat = route.params?.lat || null;
  const initialLng = route.params?.lon || null; // Attenzione: usa 'lon' o 'lng' coerentemente nel tuo router

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Strade');
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });

  useEffect(() => {
    if (initialLat && initialLng) {
      setCoords({ lat: initialLat, lng: initialLng });
    }
    // TODO: Se mancano, qui potresti usare expo-location per ottenere la posizione GPS attuale
  }, [initialLat, initialLng]);

  const handleSubmit = async () => {
    if (!title) return Alert.alert("Attenzione", "Inserisci almeno un titolo!");
    if (!coords.lat || !coords.lng) return Alert.alert("Attenzione", "Posizione non rilevata.");

    // Costruzione oggetto ticket
    const newTicket = {
      titolo: title,
      descrizione: desc,
      categoria: category,
      latitudine: coords.lat,
      longitudine: coords.lng,
      // data: new Date().toISOString() // Spesso lo gestisce il backend
    };

    // Chiamata API (Decommenta quando il backend è pronto)
    /*
    const success = await postTicket(newTicket);
    if (success) {
      Alert.alert("Successo", "Segnalazione inviata!");
      navigation.goBack();
    } else {
      Alert.alert("Errore", "Invio fallito. Riprova.");
    }
    */
    
    // Per ora, solo simulazione
    console.log("Invio Ticket:", newTicket);
    Alert.alert("Segnalazione inviata! (Simulazione)");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#1D2D44" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuova Segnalazione</Text>
          <View style={{width:28}} />
        </View>

        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity style={styles.photoBox} onPress={() => alert('Apertura Fotocamera (WIP)')}>
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

          <Text style={styles.label}>DESCRIZIONE</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Descrivi cosa vedi..." 
            multiline numberOfLines={4}
            value={desc} onChangeText={setDesc} 
          />

          {/* Box Posizione */}
          <View style={styles.infoBox}>
            <Ionicons name="location" size={20} color="#1D2D44" />
            <Text style={styles.infoText}>
              {coords.lat 
                ? `Posizione: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "Rilevamento posizione in corso..."}
            </Text>
          </View>

        </ScrollView>

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

// ... mantieni gli stili esistenti (const styles = ...)
// Assicurati di copiare gli stili che avevi nel file originale, qui omessi per brevità.
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