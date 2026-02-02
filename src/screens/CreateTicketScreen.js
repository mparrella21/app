import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { postTicket, getCategories } from '../services/ticketService'; 
import { useAuth } from '../context/AuthContext';

export default function CreateTicketScreen({ navigation, route }) {
  const { user } = useAuth();

  const initialLat = route.params?.lat || null;
  const initialLng = route.params?.lon || null;

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  
  // Categorie dinamiche (Sostituisce CATEGORY_MAP statica)
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [loadingCats, setLoadingCats] = useState(false);

  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState('');
  const [images, setImages] = useState([]); 
  const [loadingAddr, setLoadingAddr] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // A. Gestione Posizione
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

    // B. Caricamento Categorie da API
    loadCategories();
  }, [initialLat, initialLng]);

  const loadCategories = async () => {
      setLoadingCats(true);
      try {
          const apiCats = await getCategories();
          // L'API ritorna oggetti {id, label}
          if (Array.isArray(apiCats) && apiCats.length > 0) {
              setCategories(apiCats);
              setSelectedCatId(apiCats[0].id); // Seleziona la prima di default
          } else {
              // Fallback se il server non risponde, per non bloccare l'UI
              Alert.alert("Attenzione", "Impossibile caricare le categorie dal server.");
          }
      } catch (e) {
          console.error("Errore caricamento categorie", e);
      } finally {
          setLoadingCats(false);
      }
  };

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
    if (!result.canceled) {
        setImages([result.assets[0]]);
        Alert.alert("Info", "Al momento il server non supporta il caricamento foto. La foto non verrà inviata.");
    } 
  };

  const handleSubmit = async () => {
    if (!title) return Alert.alert("Attenzione", "Inserisci almeno un titolo!");
    if (!selectedCatId) return Alert.alert("Attenzione", "Seleziona una categoria!");
    if (!coords.lat || !coords.lng) return Alert.alert("Attenzione", "Posizione non rilevata.");

    setIsSubmitting(true);

    const ticketData = {
      title: title,
      descrizione: desc, // Campo aggiunto rispetto alla versione precedente
      id_status: 1,      // 1 = Ricevuto/Aperto
      lat: coords.lat,
      lon: coords.lng,
      categories: [selectedCatId], 
      user: user?.id
    };

    try {
      const success = await postTicket(ticketData, images);
      
      if (success) {
        Alert.alert("Successo", "Segnalazione inviata correttamente!");
        navigation.goBack();
      } else {
        throw new Error("Errore backend");
      }
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
            <Text style={styles.label}>CATEGORIA</Text>
            {loadingCats && <ActivityIndicator size="small" color="#1D2D44"/>}
          </View>
          
          <View style={styles.chipsRow}>
            {categories.map((cat, index) => {
               return (
                 <TouchableOpacity 
                   key={cat.id} 
                   style={[styles.chip, selectedCatId === cat.id && styles.chipActive]}
                   onPress={() => setSelectedCatId(cat.id)}
                 >
                   <Text style={[styles.chipText, selectedCatId === cat.id && styles.chipTextActive]}>
                      {cat.label}
                   </Text>
                 </TouchableOpacity>
               );
            })}
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