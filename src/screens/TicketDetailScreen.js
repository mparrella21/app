import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // Recuperiamo il contesto utente
import { COLORS } from '../styles/global';

// Dati Mock per arricchire il ticket (Timeline e Commenti che ancora non hai nel DB)
const MOCK_EXTENSIONS = {
  timeline: [
    { date: '25/01/2026 10:00', text: 'Segnalazione inviata' },
    { date: '26/01/2026 09:30', text: 'Presa in visione dal Comune' },
  ],
  commenti: [
    { user: 'Operatore', text: 'Stiamo verificando la disponibilità della squadra.', date: 'Ieri, 14:00' }
  ]
};

export default function TicketDetailScreen({ route, navigation }) {
  // 1. Recupero dati passati dalla navigazione o ID
  const { ticket: paramTicket, id } = route.params || {};
  const { user } = useAuth(); // Recupero utente reale
  
  // 2. Stato Locale
  const [ticket, setTicket] = useState(paramTicket || null);
  const [loading, setLoading] = useState(false); // Per azioni operatore
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(ticket?.rating || 0);

  // Se abbiamo solo l'ID (es. dalle notifiche), qui dovremmo fare una fetch.
  // Per ora simuliamo il caricamento unendo i dati.
  useEffect(() => {
    if (!ticket && id) {
       // Simulazione fetch by ID se manca l'oggetto intero
       setTicket({
          id: id,
          title: 'Ticket Recuperato',
          description: 'Descrizione caricata dal server...',
          status: 'In Corso',
          category: 'Generico',
          ...MOCK_EXTENSIONS
       });
    } else if (ticket && !ticket.timeline) {
       // Se ho il ticket ma mancano timeline/commenti, li aggiungo dal mock
       setTicket(prev => ({ ...prev, ...MOCK_EXTENSIONS }));
    }
  }, [id, ticket]);

  // 3. Logica Ruoli
  const isOperator = user?.role === 'operatore'; // O come definito nel tuo AuthContext
  const isCitizen = !user || user?.role === 'cittadino';
  const currentStatus = ticket?.status || ticket?.stato || 'Aperto';
  const isResolved = currentStatus === 'Risolto' || currentStatus === 'Chiuso';

  // 4. Gestione Cambio Stato (Logica Tua)
  const handleStatusChange = (newStatus) => {
    Alert.alert("Conferma", `Vuoi impostare lo stato a: ${newStatus}?`, [
        { text: "Annulla", style: "cancel" },
        { text: "Conferma", onPress: () => {
            setLoading(true);
            // SIMULAZIONE CHIAMATA API
            setTimeout(() => {
                setTicket(prev => ({ ...prev, status: newStatus })); // Aggiorno UI
                setLoading(false);
                Alert.alert("Successo", "Stato ticket aggiornato.");
            }, 1000);
        }}
    ]);
  };

  // 5. Gestione Commenti (Chat)
  const handleSendComment = () => {
    if(!newComment.trim()) return;
    const comment = { user: user?.name || 'Tu', text: newComment, date: 'Adesso' };
    setTicket(prev => ({ 
        ...prev, 
        commenti: [...(prev.commenti || []), comment] 
    }));
    setNewComment('');
  };

  // 6. Gestione Rating (Logica Tua + UI Nuova)
  const handleRating = (stars) => {
    setRating(stars);
    Alert.alert("Grazie!", `Hai valutato l'intervento con ${stars} stelle.`);
    // API call saveRating(stars)...
  };

  if (!ticket) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, backgroundColor:'#F3F4F6'}}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* IMMAGINE (Con fallback se manca) */}
        {ticket.images && ticket.images.length > 0 ? (
          <Image source={{ uri: ticket.images[0] }} style={styles.coverImg} />
        ) : (
          <View style={[styles.coverImg, styles.placeholderImg]}>
            <Ionicons name="image-outline" size={50} color="white" />
            <Text style={{color:'white', marginTop:5}}>Nessuna foto</Text>
          </View>
        )}

        <View style={styles.content}>
          
          {/* BADGES: Categoria e Stato */}
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}>
                <Text style={styles.catText}>{ticket.categoria || ticket.category || 'Generico'}</Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: isResolved ? '#D1E7DD' : (currentStatus === 'In Corso' ? '#FFF3CD' : '#F8D7DA')}]}>
                <Text style={{color: isResolved ? '#0F5132' : (currentStatus === 'In Corso' ? '#856404' : '#721C24'), fontWeight:'bold'}}>
                    {currentStatus.toUpperCase()}
                </Text>
            </View>
          </View>

          {/* DATI PRINCIPALI */}
          <Text style={styles.title}>{ticket.titolo || ticket.title}</Text>
          <Text style={styles.address}>
             <Ionicons name="location-outline" size={14} /> {ticket.indirizzo || ticket.address || 'Posizione GPS'}
          </Text>
          
          <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
          <Text style={styles.desc}>{ticket.descrizione || ticket.description || ticket.desc}</Text>

          {/* --- ZONA OPERATORE (Inserita dalla tua versione A) --- */}
          {isOperator && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Area Operatore</Text>
                {loading ? (
                    <ActivityIndicator color="#F59E0B" />
                ) : (
                    <View style={styles.opButtons}>
                        {currentStatus !== 'In Corso' && !isResolved && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#F59E0B'}]} onPress={() => handleStatusChange('In Corso')}>
                                <Ionicons name="construct" size={18} color="white" />
                                <Text style={styles.opBtnText}>PRENDI IN CARICO</Text>
                            </TouchableOpacity>
                        )}
                        
                        {!isResolved && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => handleStatusChange('Risolto')}>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.opBtnText}>RISOLTO</Text>
                            </TouchableOpacity>
                        )}

                        {isResolved && <Text style={{color:'#10B981', fontWeight:'bold'}}>Ticket chiuso dall'operatore.</Text>}
                    </View>
                )}
            </View>
          )}

          {/* TIMELINE (Nuova Feature) */}
          <Text style={styles.sectionTitle}>STORIA INTERVENTO</Text>
          <View style={styles.timeline}>
             {(ticket.timeline || []).map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                   <View style={styles.dot} />
                   <View>
                     <Text style={styles.timelineDate}>{item.date}</Text>
                     <Text style={styles.timelineText}>{item.text}</Text>
                   </View>
                </View>
             ))}
             {/* Aggiungo dinamicamente lo stato attuale alla timeline se risolto */}
             {isResolved && (
                <View style={styles.timelineItem}>
                    <View style={[styles.dot, {backgroundColor:'#10B981'}]} />
                    <Text style={[styles.timelineText, {color:'#10B981', fontWeight:'bold'}]}>Ticket Risolto</Text>
                </View>
             )}
          </View>

          {/* RATING (Solo Cittadino e se Risolto) */}
          {isResolved && isCitizen && (
            <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>Valuta l'intervento</Text>
                <View style={{flexDirection:'row', justifyContent:'center'}}>
                   {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={()=>handleRating(star)}>
                         <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" style={{marginHorizontal:4}} />
                      </TouchableOpacity>
                   ))}
                </View>
                <Text style={styles.ratingSub}>{rating > 0 ? "Valutazione inviata" : "Tocca le stelle per valutare"}</Text>
            </View>
          )}

          {/* COMMENTI / CHAT */}
          <Text style={styles.sectionTitle}>MESSAGGI</Text>
          {(ticket.commenti || []).length === 0 ? (
              <Text style={{color:'#999', fontStyle:'italic'}}>Nessun messaggio.</Text>
          ) : (
              ticket.commenti.map((c, i) => (
                <View key={i} style={[styles.msgBox, c.user === (user?.name || 'Tu') ? styles.msgMine : styles.msgOther]}>
                    <Text style={styles.msgUser}>{c.user}</Text>
                    <Text style={styles.msgText}>{c.text}</Text>
                    <Text style={styles.msgDate}>{c.date}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* INPUT COMMENTO */}
      <View style={styles.inputArea}>
         <TextInput 
            style={styles.input} 
            placeholder="Scrivi un aggiornamento..." 
            value={newComment} 
            onChangeText={setNewComment} 
         />
         <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment}>
            <Ionicons name="send" size={20} color="white" />
         </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {flex:1, justifyContent:'center', alignItems:'center'},
  
  // Header
  header: { paddingTop: 40, paddingBottom:15, paddingHorizontal:15, backgroundColor: COLORS.primary, flexDirection:'row', alignItems:'center', elevation:4 },
  backBtn: { padding:5 },
  headerTitle: { color:'white', fontSize:18, fontWeight:'bold', marginLeft:15 },
  
  // Cover
  coverImg: { width:'100%', height: 200, backgroundColor:'#ccc' },
  placeholderImg: { backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center' },
  
  // Content Body
  content: { padding: 20 },
  
  // Badges
  badgeRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:15 },
  catBadge: { backgroundColor: '#E0E0E0', paddingHorizontal:10, paddingVertical:4, borderRadius:4 },
  catText: { fontSize:12, fontWeight:'bold', color:'#555' },
  statusBadge: { paddingHorizontal:10, paddingVertical:4, borderRadius:4 },
  
  // Texts
  title: { fontSize: 22, fontWeight: 'bold', color: '#1D2D44', marginBottom: 5 },
  address: { color: '#666', marginBottom: 20, fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 20, letterSpacing: 1 },
  desc: { fontSize: 16, color: '#333', lineHeight: 24 },

  // --- Styles Operatore (Tua Versione) ---
  operatorPanel: { marginTop: 20, padding: 15, backgroundColor: '#FFF7E6', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  opTitle: { fontWeight: 'bold', color: '#B45309', marginBottom: 10, textTransform: 'uppercase', fontSize: 12 },
  opButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  opBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  opBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 5 },

  // Timeline
  timeline: { borderLeftWidth: 2, borderLeftColor: '#ddd', marginLeft: 6, paddingLeft: 15 },
  timelineItem: { marginBottom: 15 },
  dot: { width:10, height:10, borderRadius:5, backgroundColor: COLORS.primary, position:'absolute', left: -21, top: 4 },
  timelineDate: { fontSize: 11, color:'#888' },
  timelineText: { fontSize: 14, color: '#333', fontWeight:'500' },

  // Rating
  ratingBox: { backgroundColor:'#fff', padding:20, borderRadius:12, alignItems:'center', elevation:2, marginTop:20, borderTopWidth:4, borderTopColor:'#FFD700' },
  ratingTitle: { fontSize:16, fontWeight:'bold', marginBottom:10 },
  ratingSub: { fontSize: 12, color: '#6B7280', marginTop: 5 },

  // Chat/Commenti
  msgBox: { padding:12, borderRadius:12, marginBottom:10, maxWidth:'85%' },
  msgOther: { backgroundColor:'#fff', alignSelf:'flex-start', elevation:1, borderBottomLeftRadius:0 },
  msgMine: { backgroundColor: '#E3F2FD', alignSelf:'flex-end', elevation:1, borderBottomRightRadius:0 },
  msgUser: { fontWeight:'bold', fontSize:11, color: COLORS.primary, marginBottom:2 },
  msgText: { color:'#333' },
  msgDate: { fontSize:10, color:'#999', alignSelf:'flex-end', marginTop:4 },

  // Footer Input
  inputArea: { flexDirection:'row', padding:10, backgroundColor:'#fff', elevation:10, borderTopWidth:1, borderTopColor:'#eee' },
  input: { flex:1, backgroundColor:'#f0f0f0', borderRadius:20, paddingHorizontal:15, paddingVertical:10, marginRight:10 },
  sendBtn: { width:44, height:44, borderRadius:22, backgroundColor:COLORS.primary, justifyContent:'center', alignItems:'center' }
});