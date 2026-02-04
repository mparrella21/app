import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 
import * as Location from 'expo-location';

import { getCategories, postTicket, postReply } from '../services/ticketService'; 
import { searchTenantByCoordinates } from '../services/tenantService'; 
import { useAuth } from '../context/AuthContext';

export default function CreateTicketScreen({ navigation, route }) {
  const { user } = useAuth();

  const initialLat = route.params?.lat || null;
  const initialLng = route.params?.lon || null;

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  
  const [categories, setCategories] = useState([]);
  // MODIFICA: Ora è un array per gestire selezione multipla
  const [selectedCatIds, setSelectedCatIds] = useState([]); 
  const [loadingCats, setLoadingCats] = useState(false);

  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState('');
  const [images, setImages] = useState([]); 
  const [loadingAddr, setLoadingAddr] = useState(false);
  
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
    loadCategories();
  }, [initialLat, initialLng]);

  const loadCategories = async () => {
      setLoadingCats(true);
      try {
          const apiCats = await getCategories();
          if (Array.isArray(apiCats) && apiCats.length > 0) {
              setCategories(apiCats);
              // Opzionale: Se vuoi preselezionare la prima categoria, scommenta sotto
              // setSelectedCatIds([apiCats[0].id]); 
          } else {
              Alert.alert("Attenzione", "Impossibile caricare le categorie dal server.");
          }
      } catch (e) {
          console.error("Errore caricamento categorie", e);
      } finally {
          setLoadingCats(false);
      }
  };

  // Funzione per gestire la selezione/deselezione multipla
  const toggleCategory = (id) => {
      if (selectedCatIds.includes(id)) {
          // Se c'è già, lo rimuovo
          setSelectedCatIds(prev => prev.filter(cId => cId !== id));
      } else {
          // Se non c'è, lo aggiungo
          setSelectedCatIds(prev => [...prev, id]);
      }
  };

  const fetchAddress = async (lat, lon) => {
    setLoadingAddr(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: { 'User-Agent': 'CivitasApp/1.0 (info@civitas.it)' }
      });
      const data = await response.json();
      if (data && data.display_name) {
        const shortAddr = data.address.road ? `${data.address.road}, ${data.address.city || data.address.town}` : data.display_name.split(',')[0];
        setAddress(shortAddr || data.display_name);
      }
    } catch (error) {
      setAddress("Indirizzo non disponibile");
    } finally {
      setLoadingAddr(false);
    }
  };

  // RIPRISTINATO: Gestione menu foto (Galleria/Annulla)
  const handlePhotoAction = async () => {
    Alert.alert(
      "Aggiungi Foto",
      "Scegli una sorgente",
      [
        { text: "Galleria", onPress: pickImage },
        { text: "Annulla", style: "cancel" }
      ]
    );
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
        setImages([result.assets[0]]);
        Alert.alert("Info", "Al momento il server non supporta il caricamento foto. La foto non verrà inviata.");
    } 
  };

  const handleSubmit = async () => {
    if (!title) return Alert.alert("Attenzione", "Inserisci almeno il titolo!");
    // MODIFICA: Controllo se l'array è vuoto
    if (selectedCatIds.length === 0) return Alert.alert("Attenzione", "Seleziona almeno una categoria!");
    if (!coords.lat || !coords.lng) return Alert.alert("Attenzione", "Posizione non rilevata.");

    setIsSubmitting(true);

    try {
      // 1. TROVA IL TENANT (COMUNE)
      const tenantData = await searchTenantByCoordinates(coords.lat, coords.lng);

      if (!tenantData || !tenantData.tenant || !tenantData.tenant.id) {
        Alert.alert("Zona non coperta", "Comune non servito.");
        setIsSubmitting(false);
        return;
      }

      const tenantId = tenantData.tenant.id;

      // 2. CREA IL TICKET 
      // Inviamo l'array di categorie selezionate
      const ticketPayload = {
        title: title, 
        lat: coords.lat,
        lon: coords.lng,
        categories: selectedCatIds 
      };

      const createdTicket = await postTicket(ticketPayload, tenantId);
      
      if (createdTicket) {
          // 3. SE C'È UNA DESCRIZIONE, CREA LA PRIMA REPLY
          if (desc && desc.trim().length > 0) {
              const ticketId = createdTicket.id || createdTicket.insertId; 
              if(ticketId) {
                  await postReply(ticketId, tenantId, user.id, desc);
              }
          }

          Alert.alert("Successo", `Segnalazione inviata a: ${tenantData.tenant.name}`);
          navigation.goBack();
      } else {
        throw new Error("Errore creazione ticket");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Errore", "Impossibile inviare la segnalazione.");
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
          {/* RIPRISTINATO: onPress chiama handlePhotoAction */}
          <TouchableOpacity style={styles.photoBox} onPress={handlePhotoAction}>
            {images.length > 0 ? (
              <Image source={{ uri: images[0].uri }} style={styles.previewImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={40} color="#4A769E" />
                <Text style={styles.photoText}>Scatta o carica una foto</Text>
              </>
            )}
          </TouchableOpacity>
          
          {images.length > 0 && (
              <TouchableOpacity onPress={() => setImages([])} style={{alignSelf:'center', marginBottom:15}}>
                 <Text style={{color:'#D32F2F', fontSize:12}}>Rimuovi foto</Text>
              </TouchableOpacity>
          )}
          
          <Text style={styles.label}>TITOLO PROBLEMA</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Es. Buca profonda" 
            value={title} onChangeText={setTitle} 
          />

          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
            <Text style={styles.label}>CATEGORIE (Seleziona una o più)</Text>
            {loadingCats && <ActivityIndicator size="small" color="#1D2D44"/>}
          </View>
          
          <View style={styles.chipsRow}>
            {categories.map((cat) => {
               // Verifica se l'ID è nell'array dei selezionati
               const isSelected = selectedCatIds.includes(cat.id);
               return (
                   <TouchableOpacity 
                     key={cat.id} 
                     style={[styles.chip, isSelected && styles.chipActive]}
                     onPress={() => toggleCategory(cat.id)}
                   >
                     <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cat.label}
                     </Text>
                   </TouchableOpacity>
               );
            })}
          </View>

          <Text style={styles.label}>DESCRIZIONE (Opzionale)</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Aggiungi dettagli..." 
            multiline numberOfLines={4}
            value={desc} onChangeText={setDesc} 
          />

          <View style={styles.infoBox}>
            <Ionicons name="location" size={24} color="#D32F2F" />
            <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.infoTitle}>Posizione rilevata</Text>
                <Text style={styles.infoText}>
                  {address ? address : `${coords.lat?.toFixed(5)}, ${coords.lng?.toFixed(5)}`}
                </Text>
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