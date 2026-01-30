import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function TicketDetailScreen({ route, navigation }) {
  const { ticket } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Stato locale per simulare l'aggiornamento immediato nella UI
  const [currentStatus, setCurrentStatus] = useState(ticket?.status || 'Aperto');

  if (!ticket) return null;

  const isOperator = user?.role === 'operatore';

  const handleStatusChange = (newStatus) => {
    Alert.alert(
        "Conferma",
        `Vuoi impostare lo stato a: ${newStatus}?`,
        [
            { text: "Annulla", style: "cancel" },
            { 
                text: "Conferma", 
                onPress: () => {
                    setLoading(true);
                    // SIMULAZIONE CHIAMATA API
                    setTimeout(() => {
                        setCurrentStatus(newStatus);
                        setLoading(false);
                        Alert.alert("Successo", "Stato ticket aggiornato.");
                    }, 1000);
                }
            }
        ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Immagine */}
      <View style={styles.imgHeader}>
        <View style={styles.placeholderImg}>
           <Ionicons name="image" size={60} color="white" />
           <Text style={{color:'white', marginTop:10}}>Foto non disponibile</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle" size={42} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{paddingBottom: 40}}>
            
            <View style={styles.metaRow}>
                <View style={[styles.badge, getBadgeStyle(currentStatus)]}>
                    <Text style={styles.badgeText}>{currentStatus.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>Data: {ticket.date || 'Recente'}</Text>
            </View>

            <Text style={styles.title}>{ticket.title}</Text>
            
            <View style={styles.authorRow}>
                <Ionicons name="person-circle" size={24} color="#6C757D" />
                <Text style={styles.authorText}>Segnalato da: <Text style={{fontWeight:'bold'}}>{ticket.author || ticket.user || 'Anonimo'}</Text></Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.bodyText}>{ticket.description || ticket.desc || "Nessuna descrizione."}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>INDIRIZZO</Text>
                <View style={styles.locBox}>
                    <Ionicons name="location" size={20} color="#1D2D44" />
                    <Text style={styles.locText}>{ticket.address || `Lat: ${ticket.lat?.toFixed(4)}, Lon: ${ticket.lon?.toFixed(4)}`}</Text>
                </View>
            </View>

            {/* SEZIONE AZIONI (SOLO OPERATORI) */}
            {isOperator && (
                <View style={styles.operatorPanel}>
                    <Text style={styles.opTitle}>Gestione Operatore</Text>
                    {loading ? (
                        <ActivityIndicator color="#F59E0B" />
                    ) : (
                        <View style={styles.opButtons}>
                            <TouchableOpacity 
                                style={[styles.opBtn, {backgroundColor: '#F59E0B'}]} 
                                onPress={() => handleStatusChange('In Corso')}
                            >
                                <Ionicons name="construct" size={20} color="white" />
                                <Text style={styles.opBtnText}>PRENDI IN CARICO</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.opBtn, {backgroundColor: '#10B981'}]} 
                                onPress={() => handleStatusChange('Risolto')}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text style={styles.opBtnText}>CHIUDI TICKET</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

        </ScrollView>
      </View>
    </View>
  );
}

const getBadgeStyle = (status) => {
    switch(status) {
        case 'Risolto': return { backgroundColor: '#10B981' };
        case 'In Corso': return { backgroundColor: '#F59E0B' };
        default: return { backgroundColor: '#D32F2F' };
    }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1D2D44' },
  imgHeader: { height: 200, width: '100%' },
  placeholderImg: { width: '100%', height: '100%', backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 40, left: 15 },
  sheet: { flex: 1, backgroundColor: 'white', marginTop: -20, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 25, paddingTop: 25 },
  
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  date: { color: '#adb5bd', fontSize: 13 },

  title: { fontSize: 24, fontWeight: '800', color: '#1D2D44', marginBottom: 5 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  authorText: { marginLeft: 8, color: '#495057', fontSize: 14 },
  
  divider: { height: 1, backgroundColor: '#E9ECEF', marginBottom: 20 },
  
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ADB5BD', marginBottom: 10, letterSpacing: 1 },
  bodyText: { fontSize: 16, color: '#212529', lineHeight: 24 },
  
  locBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10 },
  locText: { marginLeft: 10, fontWeight: '500', color: '#1D2D44' },

  operatorPanel: { marginTop: 10, padding: 15, backgroundColor: '#FFF7E6', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  opTitle: { fontWeight: 'bold', color: '#B45309', marginBottom: 10, textTransform: 'uppercase', fontSize: 12 },
  opButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  opBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 },
  opBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 5 }
});