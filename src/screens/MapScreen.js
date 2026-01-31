import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import MapView, { Marker, Geojson } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { postTicket } from '../services/ticketService';
import { searchTenantByCoordinates } from '../services/tenantService'; // NUOVO SERVIZIO
import { OFFLINE_MODE } from '../services/config';
import { addTicket as addMockTicket } from '../services/mockTicketStore';
import { useAuth } from '../context/AuthContext';
import { getAddressFromCoordinates, searchCity } from '../services/nominatim';
import SearchBar from '../component/SearchBar';

// NOTA: Rimossa importazione statica dei confini italiani per usare API dinamica

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);
  const [address, setAddress] = useState('');
  
  // Gestione Confini Dinamici
  const [currentBoundary, setCurrentBoundary] = useState(null);
  const [isValidZone, setIsValidZone] = useState(false);
  const [validatingZone, setValidatingZone] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve il permesso di posizione per usare la mappa');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
    })();
  }, []);

  // Logica validazione zona tramite API
  const validateZoneAndSetMarker = async (lat, lon) => {
    setValidatingZone(true);
    setMarker({ latitude: lat, longitude: lon });
    setAddress("Verifica zona in corso...");
    setCurrentBoundary(null); // Pulisce il vecchio boundary
    setIsValidZone(false);

    try {
        // 1. Cerca se il punto è in un Tenant gestito
        const result = await searchTenantByCoordinates(lat, lon);

        if (result && result.boundary) {
            // Zona valida!
            setIsValidZone(true);
            setCurrentBoundary(result.boundary); // GeoJSON specifico del comune
            
            // 2. Ottieni indirizzo leggibile (opzionale, solo per UI)
            const addr = await getAddressFromCoordinates(lat, lon);
            setAddress(addr || "Posizione valida rilevata");

        } else {
            // Zona non gestita
            setIsValidZone(false);
            setAddress("Zona non coperta dal servizio");
            Alert.alert("Attenzione", "Il punto selezionato non rientra in nessuno dei comuni gestiti dal sistema.");
        }

    } catch (error) {
        console.error("Errore validazione zona:", error);
        setAddress("Impossibile verificare la zona");
    } finally {
        setValidatingZone(false);
    }
  };

  const handleLongPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    await validateZoneAndSetMarker(latitude, longitude);
  };

  const handleSearchLocation = async (query) => {
    const coords = await searchCity(query);
    if (coords) {
        const newRegion = {
            latitude: coords.lat,
            longitude: coords.lon,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        
        // Quando cerchi una città, verifica subito se è gestita
        await validateZoneAndSetMarker(coords.lat, coords.lon);
    } else {
        Alert.alert("Non trovato", "Luogo non trovato.");
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaType.Images, 
      allowsMultipleSelection: false, 
      quality: 0.5 
    });
    if (!res.canceled && res.assets && res.assets.length) {
      setImages(prev => [...prev, res.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 0.5 
    });
    if (!res.canceled && res.assets && res.assets.length) {
      setImages(prev => [...prev, res.assets[0].uri]);
    }
  };

  const removeImage = (uri) => {
    setImages(prev => prev.filter(u => u !== uri));
  };

  const handleSubmit = async () => {
    if (!marker || !title) {
      Alert.alert('Attenzione', 'Seleziona un punto sulla mappa e inserisci un titolo.');
      return;
    }

    if (!OFFLINE_MODE && !isValidZone) {
       Alert.alert('Zona non valida', 'Non puoi inviare segnalazioni fuori dai comuni gestiti.');
       return;
    }

    setLoading(true);
    const ticketUser = user?.name || 'Ospite';
    const payload = { 
        title, 
        description, 
        lat: marker.latitude, 
        lon: marker.longitude, 
        status: 'Aperto', 
        user: ticketUser, 
        address,
        images 
    };

    try {
        if (OFFLINE_MODE) {
            const newT = await addMockTicket(payload);
            if (newT) {
                Alert.alert('Successo', 'Segnalazione creata (Locale)');
                resetForm();
            } else {
                Alert.alert('Errore', 'Errore salvataggio locale');
            }
        } else {
            const success = await postTicket(payload);
            if (success) {
                Alert.alert('Inviato', 'Segnalazione inviata al server');
                resetForm();
            } else {
                Alert.alert('Errore', 'Impossibile contattare il server');
            }
        }
    } catch (e) {
        Alert.alert('Errore', e.message);
    } finally {
        setLoading(false);
    }
  };

  const resetForm = () => {
      setTitle(''); 
      setDescription(''); 
      setImages([]); 
      setMarker(null);
      setCurrentBoundary(null);
      setAddress('');
      setIsValidZone(false);
  };

  if (!region) return <View style={styles.loader}><ActivityIndicator size="large" color="#467599" /></View>;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
         <SearchBar onSearch={handleSearchLocation} />
      </View>

      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={region} 
        onLongPress={handleLongPress}
        showsUserLocation={true}
        provider={Platform.OS === 'android' ? 'google' : undefined}
      >
        {/* Disegna il confine del comune SOLO se trovato tramite API */}
        {currentBoundary && (
            <Geojson 
                geojson={currentBoundary} 
                strokeColor="#4CAF50" // Verde per indicare zona valida 
                fillColor="rgba(76, 175, 80, 0.2)" 
                strokeWidth={2}
            />
        )}

        {marker && <Marker coordinate={marker} pinColor={isValidZone ? "#D32F2F" : "#888"} />}
      </MapView>

      {/* Form Bottom Sheet */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Nuova Segnalazione</Text>
        
        <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
            {validatingZone && <ActivityIndicator size="small" color="#467599" style={{marginRight:5}}/>}
            <Text style={[styles.addressText, !isValidZone && {color:'orange'}]}>
                {address || "Tieni premuto sulla mappa per selezionare"}
            </Text>
        </View>

        <TextInput 
            style={styles.input} 
            placeholder="Titolo (es. Buca profonda)" 
            value={title} 
            onChangeText={setTitle} 
        />
        <TextInput 
            style={[styles.input, { height: 60 }]} 
            placeholder="Descrizione dettagliata..." 
            value={description} 
            onChangeText={setDescription} 
            multiline 
        />

        <View style={styles.mediaRow}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <Ionicons name="images" size={20} color="white" />
            <Text style={styles.mediaBtnText}>Galleria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: '#467599' }]} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.mediaBtnText}>Foto</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgScroll}>
            {images.map((uri, i) => (
              <View key={i} style={styles.thumbContainer}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeIcon} onPress={() => removeImage(uri)}>
                    <Ionicons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Bottone disabilitato se la zona non è valida o sta caricando */}
        <TouchableOpacity 
            style={[styles.submitBtn, (!isValidZone || loading) ? {backgroundColor:'#aaa'} : {}]} 
            onPress={handleSubmit} 
            disabled={loading || (!isValidZone && !OFFLINE_MODE)}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>INVIA SEGNALAZIONE</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute', top: 50, left: 10, right: 10, zIndex: 10,
  },
  formCard: { 
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  addressText: { fontSize: 12, color: '#666', fontStyle: 'italic', flex: 1 },
  input: { 
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', 
    borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14 
  },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mediaBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#1F2937', padding: 10, borderRadius: 8, marginHorizontal: 5 
  },
  mediaBtnText: { color: 'white', marginLeft: 5, fontWeight: '600', fontSize: 12 },
  imgScroll: { marginBottom: 10 },
  thumbContainer: { marginRight: 10, position: 'relative' },
  thumbnail: { width: 60, height: 60, borderRadius: 8 },
  removeIcon: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
  submitBtn: { 
    backgroundColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center' 
  },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
