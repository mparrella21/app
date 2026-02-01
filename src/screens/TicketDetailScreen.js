import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';
import { getTicket, getAllReplies, postReply, closeTicket, updateTicketStatus } from '../services/ticketService';
import { sendFeedback } from '../services/interventionService';

export default function TicketDetailScreen({ route, navigation }) {
  // 1. Recupero ID
  const { id, ticket: paramTicket } = route.params || {};
  const ticketId = id || paramTicket?.id;

  const { user } = useAuth();
  
  // 2. Stato Locale
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Rating state
  const [rating, setRating] = useState(0); 
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // REPORT DI INTERVENTO (Modale per IF-3.10)
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [interventionReport, setInterventionReport] = useState('');

  // 3. Helper per decodificare lo stato
  const getStatusLabel = (t) => {
      if (!t) return 'Sconosciuto';
      const sid = t.id_status || t.statusId;
      if (t.status && typeof t.status === 'string') return t.status;
      switch (sid) {
          case 1: return 'Aperto';
          case 2: return 'In Corso'; 
          case 3: return 'Risolto'; 
          case 4: return 'Chiuso';
          default: return 'Aperto';
      }
  };

  // 4. Caricamento Dati Completi
  const fetchData = async () => {
      if (!ticketId) return;
      setLoading(true);
      
      try {
        const freshTicket = await getTicket(ticketId);
        if (freshTicket) {
           setTicket(freshTicket);
           if(freshTicket.rating) {
               setRating(freshTicket.rating);
               setRatingSubmitted(true);
           }
        } else {
            Alert.alert("Errore", "Impossibile recuperare i dettagli del ticket.");
            navigation.goBack();
        }

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
  }, [ticketId]);

  const statusLabel = ticket ? getStatusLabel(ticket) : '';
  const isResolved = statusLabel.toLowerCase() === 'risolto' || statusLabel.toLowerCase() === 'chiuso';
  const isInProgress = statusLabel.toLowerCase() === 'in corso' || statusLabel.toLowerCase() === 'assegnato';
  const isOperator = user?.role === 'operatore';
  const isCitizen = !user || user?.role === 'cittadino';

  // 6. Azioni Operatore
  const handleStatusChange = async (newStatus, newStatusId) => {
    // Se l'operatore vuole risolvere, richiediamo il rapporto (IF-3.10)
    if (newStatus === 'Risolto') {
        setReportModalVisible(true);
        return;
    }

    // Altrimenti cambio stato normale (es. In Corso)
    Alert.alert("Conferma", `Vuoi impostare lo stato a "${newStatus}"?`, [
        { text: "Annulla", style: "cancel" },
        { text: "Conferma", onPress: async () => {
            performStatusUpdate(newStatus, newStatusId);
        }}
    ]);
  };

  const performStatusUpdate = async (newStatus, newStatusId) => {
      setActionLoading(true);
      const success = await updateTicketStatus(ticket.id, newStatus, newStatusId);
      setActionLoading(false);
      
      if (success) {
          fetchData();
          Alert.alert("Successo", `Stato aggiornato a ${newStatus}.`);
      } else {
          Alert.alert("Errore", "Impossibile aggiornare lo stato.");
      }
  };

  // Funzione per Gestire Chiusura con Rapporto
  const handleSubmitReportAndClose = async () => {
      if (!interventionReport.trim()) {
          Alert.alert("Attenzione", "Il rapporto di intervento è obbligatorio per chiudere il ticket.");
          return;
      }

      setReportModalVisible(false);
      setActionLoading(true);

      try {
          // 1. Invia il rapporto come messaggio dell'operatore (o su endpoint dedicato se esistente)
          await postReply(ticket.id, {
              text: `[RAPPORTO INTERVENTO UFFICIALE]: ${interventionReport}`,
              author: user?.name || 'Operatore',
              date: new Date().toISOString()
          });

          // 2. Chiudi il ticket
          const closeSuccess = await closeTicket(ticket.id);

          if (closeSuccess) {
              setInterventionReport('');
              fetchData();
              Alert.alert("Ticket Chiuso", "L'intervento è stato registrato e il ticket è stato chiuso.");
          } else {
              Alert.alert("Errore", "Impossibile chiudere il ticket, riprova.");
          }
      } catch (e) {
          console.error(e);
          Alert.alert("Errore", "Si è verificato un problema durante il salvataggio.");
      } finally {
          setActionLoading(false);
      }
  };

  // 7. Invio Messaggio
  const handleSendComment = async () => {
    if(!newComment.trim()) return;
    
    setActionLoading(true);
    const replyData = {
        text: newComment, 
        author: user?.name || 'Utente', 
        date: new Date().toISOString()
    };

    const success = await postReply(ticket.id, replyData);
    setActionLoading(false);

    if (success) {
        setNewComment('');
        fetchData(); 
    } else {
        Alert.alert("Errore", "Impossibile inviare il messaggio.");
    }
  };

  // 8. Gestione Rating
  const handleRating = async (stars) => {
    if(ratingSubmitted) return;

    Alert.alert("Valutazione", `Confermi una valutazione di ${stars} stelle?`, [
        { text: "Annulla", style: "cancel"},
        { text: "Invia", onPress: async () => {
            setRating(stars);
            setActionLoading(true);
            // [FIX] Utilizzo service corretto (Intervention)
            const success = await sendFeedback(ticket.id, stars);
            setActionLoading(false);
            
            if (success) {
                setRatingSubmitted(true);
                Alert.alert("Grazie!", "La tua valutazione è stata inviata.");
            } else {
                Alert.alert("Attenzione", "Impossibile salvare la valutazione sul server, riprova più tardi.");
            }
        }}
    ]);
  };

  if (loading) {
      return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{marginTop:10, color:'#666'}}>Caricamento Ticket...</Text>
        </View>
      );
  }

  if (!ticket) return null;

  const getStatusColor = () => {
     if (isResolved) return '#D1E7DD'; 
     if (isInProgress) return '#FFF3CD'; 
     return '#F8D7DA'; 
  };
  
  const getStatusTextColor = () => {
     if (isResolved) return '#0F5132';
     if (isInProgress) return '#856404';
     return '#721C24';
  };

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
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
                <Text style={{color: getStatusTextColor(), fontWeight:'bold'}}>
                    {statusLabel.toUpperCase()}
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
                        {!isResolved && !isInProgress && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#3B82F6', marginRight: 10}]} onPress={() => handleStatusChange('In Corso', 2)}>
                                <Ionicons name="construct" size={18} color="white" />
                                <Text style={styles.opBtnText}>PRENDI IN CARICO</Text>
                            </TouchableOpacity>
                        )}

                        {!isResolved ? (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => handleStatusChange('Risolto', 3)}>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.opBtnText}>RISOLTO</Text>
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

          {/* RATING */}
          {isResolved && isCitizen && (
            <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>
                    {ratingSubmitted ? "Grazie per il tuo feedback!" : "Valuta l'intervento"}
                </Text>
                <View style={{flexDirection:'row', justifyContent:'center'}}>
                   {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={()=>handleRating(star)} disabled={ratingSubmitted}>
                          <Ionicons 
                            name={star <= rating ? "star" : "star-outline"} 
                            size={32} 
                            color={ratingSubmitted ? "#FFC107" : "#FFD700"} 
                            style={{marginHorizontal:4, opacity: ratingSubmitted ? 0.8 : 1}} 
                          />
                      </TouchableOpacity>
                   ))}
                </View>
                <Text style={styles.ratingSub}>
                    {ratingSubmitted ? "Valutazione registrata" : "Tocca le stelle per valutare"}
                </Text>
            </View>
          )}

          {/* MESSAGGI */}
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
                        {r.user_name || r.author || (r.id_user === user?.id ? 'Tu' : 'Utente')}
                    </Text>
                    <Text style={styles.msgText}>{r.text || r.messaggio || r.body}</Text>
                    <Text style={styles.msgDate}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* INPUT BAR (Chat) */}
      {!isResolved && (
          <View style={styles.inputArea}>
             <TextInput 
                style={styles.input} 
                placeholder="Scrivi un aggiornamento..." 
                value={newComment} 
                onChangeText={setNewComment} 
             />
             <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="send" size={20} color="white" />}
             </TouchableOpacity>
          </View>
      )}

      {/* MODALE RAPPORTO INTERVENTO (IF-3.10) */}
      <Modal
          animationType="slide"
          transparent={true}
          visible={reportModalVisible}
          onRequestClose={() => setReportModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rapporto di Intervento</Text>
                  <Text style={styles.modalSub}>Descrivi le operazioni effettuate prima di chiudere il ticket.</Text>
                  
                  <TextInput 
                      style={styles.modalInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Descrizione tecnica dell'intervento..."
                      value={interventionReport}
                      onChangeText={setInterventionReport}
                  />

                  <View style={styles.modalButtons}>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ccc'}]} onPress={() => setReportModalVisible(false)}>
                          <Text style={styles.modalBtnText}>Annulla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#10B981'}]} onPress={handleSubmitReportAndClose}>
                          <Text style={styles.modalBtnText}>Conferma e Chiudi</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

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
  opButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  opBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  opBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 5 },

  ratingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 2, marginTop: 20, borderTopWidth: 4, borderTopColor: '#FFD700' },
  ratingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  ratingSub: { fontSize: 12, color: '#6B7280', marginTop: 5 },

  msgBox: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '85%' },
  msgOther: { backgroundColor: '#fff', alignSelf: 'flex-start', elevation: 1, borderBottomLeftRadius: 0 },
  msgMine: { backgroundColor: '#E3F2FD', alignSelf: 'flex-end', elevation: 1, borderBottomRightRadius: 0 },
  msgUser: { fontWeight: 'bold', fontSize: 11, color: COLORS.primary, marginBottom: 2 },
  msgText: { color: '#333' },
  msgDate: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },

  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', elevation: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary || '#D32F2F', justifyContent: 'center', alignItems: 'center' },

  // Stili Modale
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSub: { fontSize: 12, color: '#666', marginBottom: 15 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6 },
  modalBtnText: { color: 'white', fontWeight: 'bold' }
});