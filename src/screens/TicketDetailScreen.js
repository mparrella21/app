import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';
import { getTicket, getAllReplies, postReply, closeTicket } from '../services/ticketService';

export default function TicketDetailScreen({ route, navigation }) {
  // 1. Recupero dati
  const { ticket: paramTicket, id } = route.params || {};
  const { user } = useAuth();
  
  // 2. Stato Locale
  const [ticket, setTicket] = useState(paramTicket || null);
  const [replies, setReplies] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(ticket?.rating || 0); // Ripristinato Rating

  // 3. Caricamento Dati Completi
  const fetchData = async () => {
      // Mostra loading solo se non abbiamo già i dati base
      if (!ticket && !paramTicket) setLoading(true);
      
      try {
        const ticketId = id || ticket?.id || paramTicket?.id;
        if (!ticketId) return;

        // A. Scarica Dettagli Ticket
        const freshTicket = await getTicket(ticketId);
        if (freshTicket) {
           setTicket(freshTicket);
           if(freshTicket.rating) setRating(freshTicket.rating);
        }

        // B. Scarica Messaggi
        const fetchedReplies = await getAllReplies(ticketId);
        setReplies(fetchedReplies);

      } catch (error) {
        console.error("Errore fetch ticket detail", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // 4. Logica Ruoli e Stato
  const isOperator = user?.role === 'operatore';
  const isCitizen = !user || user?.role === 'cittadino';
  const currentStatus = ticket?.status || ticket?.stato || 'Aperto';
  const isResolved = currentStatus === 'Risolto' || currentStatus === 'Chiuso';

  // 5. Azioni Operatore
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Risolto') {
        Alert.alert("Conferma", "Vuoi chiudere definitivamente il ticket?", [
            { text: "Annulla", style: "cancel" },
            { text: "Conferma", onPress: async () => {
                setActionLoading(true);
                const success = await closeTicket(ticket.id);
                setActionLoading(false);
                if (success) {
                    setTicket(prev => ({ ...prev, status: 'Risolto' }));
                    Alert.alert("Successo", "Ticket chiuso correttamente.");
                } else {
                    Alert.alert("Errore", "Impossibile chiudere il ticket.");
                }
            }}
        ]);
    } else {
         Alert.alert("Info", "Cambio stato non disponibile via API.");
    }
  };

  // 6. Invio Messaggio
  const handleSendComment = async () => {
    if(!newComment.trim()) return;
    
    setActionLoading(true);
    const replyData = {
        text: newComment, 
        author: user?.name || 'Utente', // Fallback se backend non lo prende dal token
        date: new Date().toISOString()
    };

    const success = await postReply(ticket.id, replyData);
    setActionLoading(false);

    if (success) {
        setNewComment('');
        fetchData(); // Ricarica messaggi
    } else {
        Alert.alert("Errore", "Impossibile inviare il messaggio.");
    }
  };

  // 7. Gestione Rating (Ripristinato)
  const handleRating = (stars) => {
    setRating(stars);
    Alert.alert("Grazie!", `Hai valutato l'intervento con ${stars} stelle.`);
    // TODO: Aggiungere chiamata API salvataggio rating se prevista
  };

  if (loading || !ticket) {
      return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{marginTop:10, color:'#666'}}>Caricamento...</Text>
        </View>
      );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, backgroundColor:'#F3F4F6'}}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id.toString().slice(0,8)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* COPERTINA */}
        {ticket.images && ticket.images.length > 0 ? (
          <Image source={{ uri: ticket.images[0] }} style={styles.coverImg} />
        ) : (
          <View style={[styles.coverImg, styles.placeholderImg]}>
            <Ionicons name="image-outline" size={50} color="white" />
            <Text style={{color:'white', marginTop:5}}>Nessuna foto</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* BADGES */}
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}>
                <Text style={styles.catText}>{ticket.categoria || ticket.category || 'Generico'}</Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: isResolved ? '#D1E7DD' : (currentStatus === 'In Corso' ? '#FFF3CD' : '#F8D7DA')}]}>
                <Text style={{color: isResolved ? '#0F5132' : (currentStatus === 'In Corso' ? '#856404' : '#721C24'), fontWeight:'bold'}}>
                    {currentStatus ? currentStatus.toUpperCase() : 'APERTO'}
                </Text>
            </View>
          </View>

          <Text style={styles.title}>{ticket.titolo || ticket.title}</Text>
          <Text style={styles.address}>
             <Ionicons name="location-outline" size={14} /> {ticket.indirizzo || ticket.address || 'Posizione non disponibile'}
          </Text>

          <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
          <Text style={styles.desc}>{ticket.descrizione || ticket.description || ticket.desc || "Nessuna descrizione."}</Text>

          {/* AREA OPERATORE */}
          {isOperator && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Pannello Operatore</Text>
                {actionLoading ? (
                    <ActivityIndicator color="#F59E0B" />
                ) : (
                    <View style={styles.opButtons}>
                        {!isResolved ? (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => handleStatusChange('Risolto')}>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.opBtnText}>SEGNA COME RISOLTO</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={{color:'#10B981', fontWeight:'bold', textAlign:'center', flex:1}}>
                                <Ionicons name="lock-closed" size={14}/> Ticket Chiuso
                            </Text>
                        )}
                    </View>
                )}
            </View>
          )}

          {/* RATING (Ripristinato) */}
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

          {/* MESSAGGI (Stile Chat Ripristinato) */}
          <Text style={styles.sectionTitle}>MESSAGGI</Text>
          {replies.length === 0 ? (
              <View style={{padding:20, alignItems:'center'}}>
                  <Ionicons name="chatbubble-outline" size={24} color="#ccc"/>
                  <Text style={{color:'#999', fontStyle:'italic', marginTop:5}}>Nessun messaggio.</Text>
              </View>
          ) : (
              replies.map((r, i) => (
                <View key={i} style={[styles.msgBox, r.id_user === user?.id ? styles.msgMine : styles.msgOther]}>
                    <Text style={styles.msgUser}>
                        {r.user_name || (r.author) || (r.id_user === user?.id ? 'Tu' : 'Utente')}
                    </Text>
                    <Text style={styles.msgText}>{r.text || r.messaggio || r.body}</Text>
                    <Text style={styles.msgDate}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* INPUT BAR */}
      <View style={styles.inputArea}>
         <TextInput 
            style={styles.input} 
            placeholder="Scrivi un aggiornamento..." 
            value={newComment} 
            onChangeText={setNewComment} 
         />
         <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={actionLoading}>
            <Ionicons name="send" size={20} color="white" />
         </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: COLORS.primary || '#D32F2F', flexDirection: 'row', alignItems: 'center', elevation: 4 },
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  coverImg: { width: '100%', height: 200, backgroundColor: '#ccc' },
  placeholderImg: { backgroundColor: '#467599', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  catBadge: { backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  catText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  
  title: { fontSize: 22, fontWeight: 'bold', color: '#1D2D44', marginBottom: 5 },
  address: { color: '#666', marginBottom: 20, fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 20, letterSpacing: 1 },
  desc: { fontSize: 16, color: '#333', lineHeight: 24 },

  operatorPanel: { marginTop: 20, padding: 15, backgroundColor: '#FFF7E6', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  opTitle: { fontWeight: 'bold', color: '#B45309', marginBottom: 10, textTransform: 'uppercase', fontSize: 12 },
  opButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  opBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  opBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 5 },

  ratingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 2, marginTop: 20, borderTopWidth: 4, borderTopColor: '#FFD700' },
  ratingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  ratingSub: { fontSize: 12, color: '#6B7280', marginTop: 5 },

  // Stili Messaggi Ripristinati
  msgBox: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '85%' },
  msgOther: { backgroundColor: '#fff', alignSelf: 'flex-start', elevation: 1, borderBottomLeftRadius: 0 },
  msgMine: { backgroundColor: '#E3F2FD', alignSelf: 'flex-end', elevation: 1, borderBottomRightRadius: 0 },
  msgUser: { fontWeight: 'bold', fontSize: 11, color: COLORS.primary, marginBottom: 2 },
  msgText: { color: '#333' },
  msgDate: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },

  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', elevation: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary || '#D32F2F', justifyContent: 'center', alignItems: 'center' }
});