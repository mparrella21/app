import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { postTicket } from '../services/ticketService';
import { OFFLINE_MODE } from '../services/config';
import { addTicket as addMockTicket } from '../services/mockTicketStore';
import * as ImagePicker from 'expo-image-picker';
import { Image, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

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
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
    })();
  }, []);

  const handleLongPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.6 });
    if (!res.canceled && res.assets && res.assets.length) {
      setImages(prev => [...prev, res.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets && res.assets.length) {
      setImages(prev => [...prev, res.assets[0].uri]);
    }
  };

  const removeImage = (uri) => {
    Alert.alert('Rimuovi immagine', 'Vuoi rimuovere questa immagine?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => setImages(prev => prev.filter(u => u !== uri)) }
    ]);
  };

  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!marker || !title) {
      Alert.alert('Dati mancanti', 'Seleziona un punto e inserisci un titolo');
      return;
    }

    setLoading(true);
    const ticketUser = user?.name || 'Ospite';

    if (OFFLINE_MODE) {
      const newT = await addMockTicket({ title, description, lat: marker.latitude, lon: marker.longitude, status: 'open', user: ticketUser, images });
      setLoading(false);
      if (newT) {
        Alert.alert('Creato', 'Segnalazione creata (locale)');
        navigation.navigate('Home');
      } else {
        Alert.alert('Errore', 'Impossibile creare la segnalazione locale');
      }
      return;
    }

    const success = await postTicket({ title, description, lat: marker.latitude, lon: marker.longitude });
    setLoading(false);

    if (success) {
      Alert.alert('Inviato', 'Segnalazione inviata con successo');
      navigation.goBack();
    } else {
      Alert.alert('Errore', 'Impossibile inviare la segnalazione');
    }
  };

  if (!region) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} onLongPress={handleLongPress}>
        {marker && <Marker coordinate={marker} />}
      </MapView>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Titolo" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Descrizione" value={description} onChangeText={setDescription} multiline />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}><Text style={{color:'#fff'}}>Scegli</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { marginLeft: 8 }]} onPress={takePhoto}><Text style={{color:'#fff'}}>Scatta</Text></TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft:10}}>
            {images.map((uri, i) => (
              <TouchableOpacity key={i} onPress={() => removeImage(uri)}>
                <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 8 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Invia segnalazione</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  form: { padding: 12, backgroundColor: 'white' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { backgroundColor: '#D32F2F', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});
