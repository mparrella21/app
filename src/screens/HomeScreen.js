import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import SearchBar from '../component/SearchBar';
import AppHeader from '../component/AppHeader';
import { COLORS } from '../styles/global';
import { useAuth } from '../context/AuthContext';
import { getAllTickets } from '../services/ticketService';
import { geocode } from '../services/nominatim';
import { OFFLINE_MODE } from '../services/config';
import { initMock, getAll } from '../services/mockTicketStore';

const INITIAL_REGION = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 6.0,
  longitudeDelta: 6.0,
};

export default function HomeScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polygons, setPolygons] = useState([]);
  const [searchMarker, setSearchMarker] = useState(null);
  const [showPolygons, setShowPolygons] = useState(true);
  const mapRef = useRef(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (OFFLINE_MODE) {
          await initMock();
          const m = await getAll();
          setTickets(m);
        } else {
          const t = await getAllTickets();
          setTickets(t);
        }
      } catch (e) {
        console.warn('HomeScreen.loadTickets', e);
      }
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    // Carichiamo una versione semplificata dell'Italia (file JSON incluso nel bundle)
    try {
      const geo = require('../assets/data/limits_IT_simplified.json');
      const result = [];
      if (geo && geo.features) {
        geo.features.forEach(f => {
          if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
            if (f.geometry.type === 'Polygon') {
              const coords = f.geometry.coordinates[0].map(c => ({ latitude: c[1], longitude: c[0] }));
              result.push({ coords, name: f.properties?.name });
            } else if (f.geometry.type === 'MultiPolygon') {
              f.geometry.coordinates.forEach(poly => {
                const coords = poly[0].map(c => ({ latitude: c[1], longitude: c[0] }));
                result.push({ coords, name: f.properties?.name });
              });
            }
          }
        });
      }
      setPolygons(result);
    } catch (e) {
      console.warn('Errore caricamento GeoJSON semplificato', e);
    }
  }, []);

  const handleSearch = async (q) => {
    if (!q || q.trim().length === 0) return;

    try {
      const res = await geocode(q);
      if (!res) {
        Alert.alert('Nessun risultato', `Nessun risultato trovato per "${q}"`);
        return;
      }

      const region = {
        latitude: res.lat,
        longitude: res.lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };

      if (mapRef.current && mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion(region, 500);
      }

      setSearchMarker({ latitude: res.lat, longitude: res.lon, title: res.display_name });

    } catch (e) {
      console.error('HomeScreen.handleSearch', e);
      Alert.alert('Errore', e?.message || 'Impossibile eseguire la ricerca');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        navigation={navigation}
        searchText={searchText}
        setSearchText={setSearchText}
        onSearch={handleSearch}
      />

      {/* Map */}
      <View style={styles.mapWrap}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION}>
            {showPolygons && polygons.map((p, idx) => (
              <Polygon key={idx} coordinates={p.coords} strokeColor={COLORS.secondary} fillColor={'rgba(0,155,217,0.08)'} />
            ))}

            {tickets.map(t => (
              <Marker key={t.id} coordinate={{ latitude: Number(t.lat), longitude: Number(t.lon) }} onPress={() => navigation.navigate('TicketDetail', { id: t.id })} />
            ))}

            {searchMarker && (
              <Marker coordinate={{ latitude: searchMarker.latitude, longitude: searchMarker.longitude }} pinColor="blue" />
            )}

            {/* Poligoni dal GeoJSON principale, se disponibile */}
            {/** Se esiste il file limits_IT_municipalities.json verrà caricato al runtime */}
            
          </MapView>
        )}

        {/* Confini overlay button (solo per Italia) */}
        <TouchableOpacity style={[styles.confiniOverlay, showPolygons ? { backgroundColor: COLORS.primary } : { backgroundColor: 'rgba(0,0,0,0.12)' }]} onPress={() => setShowPolygons(v => !v)}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{showPolygons ? 'Confini' : 'Mostra'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { height: 80, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchWrap: { flex: 1 },
  headerRight: { marginLeft: 12, flexDirection: 'row', alignItems: 'center' },
  confiniOverlay: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 6, shadowColor:'#000', shadowOpacity:0.12 }
});
  btnAccess: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.light, backgroundColor: 'transparent' },
  btnText: { color: COLORS.light },
  userBox: { flexDirection: 'row', alignItems: 'center' },
  userName: { color: COLORS.light, fontWeight: 'bold', marginLeft: 8 },
  areaBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: COLORS.light, marginRight: 8 },
  areaText: { color: COLORS.primary, fontWeight: '700' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  addButtonText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  confiniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.light, marginRight: 8 },
  confiniText: { color: COLORS.light, fontSize: 12 }
});