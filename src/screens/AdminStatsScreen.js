// src/screens/AdminStatsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Importiamo le icone
import { COLORS } from '../styles/global';
import { 
    getGlobalVolumes, 
    getComparativePerformance, 
    getCategoriesDistribution, 
    getGeoDistribution 
} from '../services/adminStatsService';

export default function AdminStatsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [volumes, setVolumes] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [categories, setCategories] = useState(null);
    const [geo, setGeo] = useState(null);

    const loadData = async () => {
        setLoading(true);
        const [volData, perfData, catData, geoData] = await Promise.all([
            getGlobalVolumes(),
            getComparativePerformance(),
            getCategoriesDistribution(),
            getGeoDistribution()
        ]);
        
        setVolumes(volData);
        setPerformance(perfData);
        setCategories(catData);
        setGeo(geoData);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Helper per renderizzare una barra semplice
    const renderBar = (value, max, color) => {
        const width = max > 0 ? (value / max) * 100 : 0;
        return (
            <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                <View style={{ width: `${width}%`, backgroundColor: color, height: '100%' }} />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* HEADER PERSONALIZZATO (Stile StatsDashboardScreen) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Statistiche Admin</Text>
                <TouchableOpacity onPress={loadData} style={{ padding: 5 }}>
                    <Ionicons name="reload" size={24} color="white" />
                </TouchableOpacity>
            </View>
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
                {/* 1. VOLUMI GLOBALI */}
                {volumes && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Volumi Globali</Text>
                        <View style={styles.grid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{volumes.global_total_tickets}</Text>
                                <Text style={styles.statLabel}>Totale Ticket</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{volumes.global_open_tickets}</Text>
                                <Text style={styles.statLabel}>Aperti</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{volumes.global_resolved_tickets}</Text>
                                <Text style={styles.statLabel}>Risolti</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{volumes.global_resolution_rate}%</Text>
                                <Text style={styles.statLabel}>Tasso Risoluz.</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 2. PERFORMANCE TENANT (COMPARATIVE) */}
                {performance.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Performance Comuni</Text>
                        {performance.map((item, index) => (
                            <View key={index} style={styles.rowItem}>
                                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                    <Text style={styles.rowLabel}>{item.tenant}</Text>
                                    <Text style={styles.rowValue}>Score: {item.score.toFixed(1)}</Text>
                                </View>
                                {renderBar(item.score, 1000, COLORS.accent)} 
                                <Text style={styles.subText}>Vol: {item.ticket_volume} | Avg Age: {item.avg_age_hours.toFixed(1)}h</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. CATEGORIE */}
                {categories && categories.top_categories && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Distribuzione Categorie</Text>
                        {categories.top_categories.map((cat, index) => {
                             const maxVal = categories.top_categories[0][1];
                             return (
                                <View key={index} style={styles.rowItem}>
                                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                        <Text style={styles.rowLabel}>{cat[0]}</Text>
                                        <Text style={styles.rowValue}>{cat[1]}</Text>
                                    </View>
                                    {renderBar(cat[1], maxVal, COLORS.primary)}
                                </View>
                             );
                        })}
                    </View>
                )}

                {/* 4. GEO DISTRIBUTION */}
                {geo && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Distribuzione Geografica</Text>
                        {Object.entries(geo).map(([regionName, regionData], idx) => (
                            <View key={idx} style={styles.geoSection}>
                                <Text style={styles.regionTitle}>{regionName} ({regionData.total_tickets} tickets)</Text>
                                {Object.entries(regionData.provinces).map(([provName, provData], pIdx) => (
                                    <View key={pIdx} style={styles.provinceRow}>
                                        <Text style={styles.provinceText}>• {provName}</Text>
                                        <Text style={styles.provinceStats}>
                                            {provData.tickets} tkt | {provData.tenants_active} attivi | {provData.avg_resolution_hours.toFixed(1)}h ris.
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    // STILI HEADER AGGIUNTI
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937', padding: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    scrollContent: { padding: 16, paddingBottom: 40 },
    
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12 },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statItem: { width: '48%', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: 12, color: '#6B7280' },

    rowItem: { marginBottom: 12 },
    rowLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    rowValue: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    subText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

    geoSection: { marginBottom: 12, borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:8 },
    regionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
    provinceRow: { flexDirection: 'column', paddingLeft: 10, marginBottom: 4 },
    provinceText: { fontSize: 14, color: '#374151', fontWeight:'500' },
    provinceStats: { fontSize: 12, color: '#6B7280', marginLeft: 10 }
});