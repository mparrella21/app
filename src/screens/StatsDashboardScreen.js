import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/global';
import { useAuth } from '../context/AuthContext';
import { getOperatorsByTenant } from '../services/userService';
import { 
    getTicketStatusStats, 
    getResponseTimeStats, 
    getOperatorPerformanceStats, 
    getTicketTrendsStats, 
    getAssignmentCoverageStats 
} from '../services/statsService';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StatsDashboardScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [statusData, setStatusData] = useState(null);
    const [timeData, setTimeData] = useState(null);
    const [operatorStats, setOperatorStats] = useState([]);
    const [trends, setTrends] = useState([]);
    const [coverage, setCoverage] = useState(null);
    const [operatorsMap, setOperatorsMap] = useState({}); // Mappa ID -> Nome Reale

    const loadAllStats = async () => {
        if (!user?.tenant_id) return;
        setLoading(true);
        try {
            // 1. Carichiamo la lista operatori per avere i nomi veri
            const opsList = await getOperatorsByTenant(user.tenant_id);
            const opMap = {};
            if(Array.isArray(opsList)) {
                opsList.forEach(op => {
                    opMap[op.id] = `${op.name} ${op.surname}`;
                });
            }
            setOperatorsMap(opMap);

            // 2. Chiamate parallele alle API statistiche
            const [sData, tData, oData, trData, cData] = await Promise.all([
                getTicketStatusStats(user.tenant_id),
                getResponseTimeStats(user.tenant_id),
                getOperatorPerformanceStats(user.tenant_id),
                getTicketTrendsStats(user.tenant_id),
                getAssignmentCoverageStats(user.tenant_id)
            ]);

            setStatusData(sData);
            setTimeData(tData);
            setOperatorStats(oData || []);
            setTrends(trData || []);
            setCoverage(cData);

        } catch (e) {
            console.error("Errore caricamento statistiche", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllStats();
    }, [user]);

    // --- Componenti UI Interni ---

    const InfoCard = ({ title, value, sub, color }) => (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color, flex: 1, marginHorizontal: 4 }]}>
            <Text style={styles.cardLabel}>{title}</Text>
            <Text style={[styles.cardValue, { color: color }]}>{value}</Text>
            {sub && <Text style={styles.cardSub}>{sub}</Text>}
        </View>
    );

    const TrendChart = ({ data }) => {
        if (!data || data.length === 0) return <Text>Nessun dato trend</Text>;
        const maxVal = Math.max(...data.map(d => d.count), 1); // Evita divisione per 0
        
        return (
            <View style={styles.chartContainer}>
                {data.slice(-7).map((item, index) => { // Ultimi 7 giorni
                    const heightPct = (item.count / maxVal) * 100;
                    const dateObj = new Date(item.date);
                    const dayLabel = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
                    
                    return (
                        <View key={index} style={styles.barWrapper}>
                            <Text style={styles.barValue}>{item.count > 0 ? item.count : ''}</Text>
                            <View style={[styles.bar, { height: `${heightPct}%`, backgroundColor: item.count > 0 ? COLORS.primary : '#e0e0e0' }]} />
                            <Text style={styles.barLabel}>{dayLabel}</Text>
                        </View>
                    )
                })}
            </View>
        )
    };

    const CoverageBar = ({ percentage }) => (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontWeight: 'bold', color: '#555' }}>Copertura Assegnazioni</Text>
                <Text style={{ fontWeight: 'bold', color: percentage < 50 ? 'red' : 'green' }}>{percentage}%</Text>
            </View>
            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: percentage < 50 ? '#D32F2F' : '#4CAF50' }} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Statistiche Tenant</Text>
                <TouchableOpacity onPress={loadAllStats} style={{ padding: 5 }}>
                    <Ionicons name="reload" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAllStats} />}
            >
                {/* SEZIONE 1: STATO TICKET */}
                <Text style={styles.sectionTitle}>Panoramica Ticket</Text>
                <View style={styles.row}>
                    <InfoCard 
                        title="Totali" 
                        value={statusData?.total || 0} 
                        color="#333" 
                    />
                    <InfoCard 
                        title="Aperti" 
                        value={statusData?.breakdown?.Aperto || 0} 
                        color="#D32F2F" 
                    />
                    <InfoCard 
                        title="Risolti" 
                        value={statusData?.breakdown?.Risolto || 0} 
                        color="#4CAF50" 
                    />
                </View>

                {/* SEZIONE 2: COPERTURA */}
                {coverage && (
                    <View style={styles.sectionCard}>
                        <CoverageBar percentage={coverage.coverage_percentage} />
                        <Text style={styles.subText}>
                            {coverage.assigned_active_tickets} assegnati su {coverage.total_active_tickets} attivi ({coverage.unassigned_active_tickets} non assegnati).
                        </Text>
                    </View>
                )}

                {/* SEZIONE 3: TEMPI DI RISPOSTA */}
                <Text style={styles.sectionTitle}>Tempi di Risoluzione (Ore)</Text>
                <View style={styles.row}>
                    <InfoCard 
                        title="Media" 
                        value={timeData?.avg_hours_open?.toFixed(1) || '-'} 
                        color="#F59E0B" 
                    />
                    <InfoCard 
                        title="Mediana" 
                        value={timeData?.median_hours_open?.toFixed(1) || '-'} 
                        color="#F59E0B" 
                    />
                     <InfoCard 
                        title="Max" 
                        value={timeData?.max_hours_open?.toFixed(1) || '-'} 
                        color="#F59E0B" 
                    />
                </View>

                {/* SEZIONE 4: TREND GIORNALIERO */}
                <Text style={styles.sectionTitle}>Nuovi Ticket (Ultimi 7gg)</Text>
                <View style={styles.sectionCard}>
                    <TrendChart data={trends} />
                </View>

                {/* SEZIONE 5: PERFORMANCE OPERATORI */}
                <Text style={styles.sectionTitle}>Carico Lavoro Operatori</Text>
                <View style={styles.sectionCard}>
                    {operatorStats.map((op, idx) => {
                        const realName = operatorsMap[op.operator_id] || operatorsMap[op.operator_name] || "Operatore Sconosciuto";
                        const isUUID = realName.length > 20 && realName.includes('-');
                        const displayName = isUUID ? `Operatore #${realName.substring(0,5)}` : realName;

                        return (
                            <View key={idx} style={styles.operatorRow}>
                                <View style={{flex:1}}>
                                    <Text style={styles.opName}>{displayName}</Text>
                                    <Text style={styles.opSub}>ID: {op.operator_id.substring(0,8)}...</Text>
                                </View>
                                <View style={styles.opBadge}>
                                    <Text style={styles.opBadgeText}>{op.assigned_tickets} Ticket</Text>
                                </View>
                            </View>
                        );
                    })}
                    {operatorStats.length === 0 && <Text style={{color:'#999', fontStyle:'italic'}}>Nessun dato operatori.</Text>}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937', padding: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginTop: 20, marginBottom: 10, marginLeft: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    
    card: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2, alignItems: 'center', justifyContent:'center' },
    cardLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    cardValue: { fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
    cardSub: { fontSize: 10, color: '#999' },

    sectionCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2 },
    subText: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },

    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingTop: 20 },
    barWrapper: { alignItems: 'center', flex: 1 },
    bar: { width: 12, borderRadius: 4, minHeight: 4 },
    barValue: { fontSize: 10, color: '#666', marginBottom: 2 },
    barLabel: { fontSize: 10, color: '#999', marginTop: 5 },

    operatorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    opName: { fontWeight: 'bold', color: '#333' },
    opSub: { fontSize: 10, color: '#999' },
    opBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    opBadgeText: { color: '#1976D2', fontSize: 12, fontWeight: 'bold' }
});