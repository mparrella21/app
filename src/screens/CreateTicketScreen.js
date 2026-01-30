import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// Assicurati che il percorso sia corretto in base alla tua struttura cartelle
import { postTicket } from '../services/ticketService'; 

export default function CreateTicketScreen({ navigation, route }) {
  // 1. Recupera coordinate dai parametri (dalla Mappa)
  const initialLat = route.params?.lat || null;
  const initialLng = route.params?.lon || null;

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Strade');
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loadingAddr, setLoadingAddr] = useState(false);
  
  // STATO PER IL CARICAMENTO INVIO
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLat && initialLng) {
      setCoords({ lat: initialLat, lng: initialLng });
      fetchAddress(initialLat, initialLng);
    } else {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
          fetchAddress(location.coords.latitude, location.coords.longitude);
        }
      })();
    }
  }, [initialLat, initialLng]);

  const fetchAddress = async (lat, lon) => {
    setLoadingAddr(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data && data.display_name) {
        const shortAddr = data.address.road ? `${data.address.road}, ${data.address.city || data.address.town}` : data.display_name.split(',')[0];
        setAddress(shortAddr || data.display_name);
      }
    } catch (error) {
      console.log("Errore reverse geocoding:", error);
      setAddress("Indirizzo non disponibile");
    } finally {
      setLoadingAddr(false);
    }
  };

  const handlePhotoAction = async () => {
    Alert.alert(
      "Aggiungi Foto",
      "Scegli una sorgente",
      [
        { text: "Galleria", onPress: pickImage },
        { text: "Fotocamera", onPress: takePhoto },
        { text: "Annulla", style: "cancel" }
      ]
    );
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } else {
      Alert.alert("Permesso negato", "Serve il permesso fotocamera.");
    }
  };

  const handleSubmit = async () => {
    if (!title) return Alert.alert("Attenzione", "Inserisci almeno un titolo!");
    if (!coords.lat || !coords.lng) return Alert.alert("Attenzione", "Posizione non rilevata.");

    setIsSubmitting(true);

    const newTicket = {
      titolo: title,
      descrizione: desc,
      categoria: category,
      latitudine: coords.lat,
      longitudine: coords.lng,
      indirizzo: address,
      immagine: imageUri,
      data: new Date().toISOString(),
      stato: 'Ricevuto' // Stato iniziale come da UC-03
    };

    try {
      // Chiamata effettiva al servizio (assicurati che ticketService esista e funzioni)
      await postTicket(newTicket);
      
      Alert.alert("Successo", "Segnalazione inviata correttamente!");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Errore", "Impossibile inviare la segnalazione al momento.");
    } finally {
      setIsSubmitting(false);
    }
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
          <TouchableOpacity style={styles.photoBox} onPress={handlePhotoAction}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={40} color="#4A769E" />
                <Text style={styles.photoText}>Scatta o carica una foto</Text>
              </>
            )}
          </TouchableOpacity>
          {imageUri && (
             <TouchableOpacity onPress={() => setImageUri(null)} style={{alignSelf:'center', marginBottom:15}}>
                <Text style={{color:'#D32F2F', fontSize:12}}>Rimuovi foto</Text>
             </TouchableOpacity>
          )}

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

          <View style={styles.infoBox}>
            <Ionicons name="location" size={24} color="#D32F2F" />
            <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.infoTitle}>Posizione rilevata</Text>
                {loadingAddr ? (
                    <Text style={styles.infoText}>Ricerca indirizzo...</Text>
                ) : (
                    <Text style={styles.infoText}>
                      {address ? address : `${coords.lat?.toFixed(5)}, ${coords.lng?.toFixed(5)}`}
                    </Text>
                )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && {backgroundColor: '#888'}]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
                <ActivityIndicator color="white" />
            ) : (
                <>
                    <Text style={styles.submitText}>INVIA SEGNALAZIONE</Text>
                    <Ionicons name="send" size={18} color="white" style={{marginLeft: 10}} />
                </>
            )}
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
  photoBox: { height: 180, backgroundColor: '#E9ECEF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E0', marginBottom: 10, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoText: { marginTop: 10, color: '#6C757D', fontWeight: '500' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#6C757D', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#DEE2E6', marginBottom: 20, color: '#1D2D44' },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#DEE2E6', marginRight: 10, marginBottom: 10 },
  chipActive: { backgroundColor: '#1D2D44', borderColor: '#1D2D44' },
  chipText: { color: '#495057', fontSize: 14 },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth:1, borderColor:'#eee', elevation:1 },
  infoTitle: { fontWeight:'bold', color: '#333', fontSize: 14},
  infoText: { color: '#555', fontSize: 13, flexWrap:'wrap' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  submitBtn: { backgroundColor: '#D32F2F', borderRadius: 10, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});