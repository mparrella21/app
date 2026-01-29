import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicketDetailScreen({ route, navigation }) {
  const { ticket } = route.params || {};

  if (!ticket) return null;

  return (
    <View style={styles.container}>
      
      {/* Immagine Header (Placeholder) */}
      <View style={styles.imgHeader}>
        <View style={styles.placeholderImg}>
           <Ionicons name="image" size={50} color="white" />
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle" size={42} color="white" />
        </TouchableOpacity>
      </View>

      {/* Contenuto Arrotondato che sale */}
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{paddingBottom: 40}}>
            
            {/* Header: Stato e Data */}
            <View style={styles.metaRow}>
                <View style={[styles.badge, ticket.status === 'Aperto' ? styles.bgRed : styles.bgOrange]}>
                    <Text style={styles.badgeText}>{ticket.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>29 Gen 2026</Text>
            </View>

            <Text style={styles.title}>{ticket.title}</Text>
            
            <View style={styles.authorRow}>
                <Ionicons name="person-circle" size={28} color="#6C757D" />
                <Text style={styles.authorText}>Segnalato da <Text style={{fontWeight:'bold'}}>{ticket.author}</Text></Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.bodyText}>{ticket.desc || "Nessuna descrizione fornita."}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>POSIZIONE</Text>
                <View style={styles.locBox}>
                    <Ionicons name="location" size={20} color="#1D2D44" />
                    <Text style={styles.locText}>Lat: {ticket.lat.toFixed(4)}, Lon: {ticket.lon.toFixed(4)}</Text>
                </View>
            </View>

            {/* Timeline Aggiornamenti (Statici) */}
            <View style={styles.timeline}>
                <Text style={styles.sectionTitle}>STORICO AGGIORNAMENTI</Text>
                <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.tlUser}>Sistema</Text>
                        <Text style={styles.tlText}>Ticket creato e in attesa di approvazione.</Text>
                        <Text style={styles.tlDate}>Oggi, 10:30</Text>
                    </View>
                </View>
            </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1D2D44' },
  imgHeader: { height: 250, width: '100%' },
  placeholderImg: { width: '100%', height: '100%', backgroundColor: '#4A769E', justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 40, left: 15 },
  sheet: { flex: 1, backgroundColor: 'white', marginTop: -40, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingTop: 30, overflow: 'hidden' },
  
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  bgRed: { backgroundColor: '#D32F2F' },
  bgOrange: { backgroundColor: 'orange' },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  date: { color: '#adb5bd', fontSize: 13, fontWeight: '500' },

  title: { fontSize: 26, fontWeight: '800', color: '#1D2D44', marginBottom: 10, lineHeight: 32 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  authorText: { marginLeft: 10, color: '#495057', fontSize: 15 },
  
  divider: { height: 1, backgroundColor: '#E9ECEF', marginBottom: 20 },
  
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ADB5BD', marginBottom: 10, letterSpacing: 1 },
  bodyText: { fontSize: 16, color: '#212529', lineHeight: 24 },
  
  locBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10 },
  locText: { marginLeft: 10, fontWeight: '500', color: '#1D2D44' },

  timeline: { marginTop: 10 },
  timelineItem: { flexDirection: 'row', paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#E9ECEF', marginLeft: 5, paddingBottom: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A769E', position: 'absolute', left: -7, top: 0 },
  timelineContent: { marginLeft: 20, marginTop: -4 },
  tlUser: { fontWeight: 'bold', color: '#1D2D44' },
  tlText: { marginTop: 4, color: '#495057' },
  tlDate: { marginTop: 4, fontSize: 12, color: '#ADB5BD' }
});