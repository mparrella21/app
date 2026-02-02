import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

import { 
    getTicket, 
    getAllReplies, 
    postReply, 
    updateReply, 
    deleteReply, 
    closeTicket, 
    updateTicketStatus, 
    deleteTicket, 
    assignTicket, 
    updateTicketDetails 
} from '../services/ticketService';
import { sendFeedback } from '../services/interventionService';
import { getOperatorsByTenant } from '../services/userService'; 
import { getAddressFromCoordinates } from '../services/nominatim';

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

  // REPORT DI INTERVENTO
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [interventionReport, setInterventionReport] = useState('');
  const [reportImage, setReportImage] = useState(null); 

  // ASSEGNAZIONE
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  
  // STATO MODIFICA TICKET (Manager)
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // STATO MODIFICA MESSAGGIO (Reply)
  const [editReplyModalVisible, setEditReplyModalVisible] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');

  // 3. Helper per decodificare lo stato
  const getStatusLabel = (t) => {
      if (!t) return 'Sconosciuto';
      const sid = t.id_status || t.statusId;
      if (t.status && typeof t.status === 'string') return t.status;
      switch (sid) {
          case 1: return 'Ricevuto'; 
          case 2: return 'In Lavorazione'; 
          case 3: return 'Risolto'; 
          case 4: return 'Chiuso';
          default: return 'Ricevuto';
      }
  };

  // 4. Caricamento Dati Completi
  const fetchData = async () => {
      if (!ticketId) return;
      setLoading(true);
      
      try {
        const freshTicket = await getTicket(ticketId);
        if (freshTicket) {
           if ((!freshTicket.indirizzo && !freshTicket.address) && freshTicket.lat && freshTicket.lon) {
               try {
                   const resolvedAddress = await getAddressFromCoordinates(freshTicket.lat, freshTicket.lon);
                   freshTicket.address = resolvedAddress;
               } catch (err) {
                   console.warn("Impossibile risolvere indirizzo", err);
               }
           }

           setTicket(freshTicket);
           setEditTitle(freshTicket.titolo || freshTicket.title);
           setEditDesc(freshTicket.descrizione || freshTicket.description || freshTicket.desc);

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
  const isInProgress = statusLabel.toLowerCase() === 'in lavorazione' || statusLabel.toLowerCase() === 'assegnato' || statusLabel.toLowerCase() === 'in corso';
  
  // Ruoli
  const isOperator = user?.role === 'operatore';
  const isCitizen = !user || user?.role === 'cittadino';
  const isManager = user?.role === 'responsabile' || user?.role === 'maintenance_manager'; 

  // --- GESTIONE MESSAGGI (REPLY) ---
  const handleLongPressReply = (reply) => {
      // Permetti modifica solo se l'utente è l'autore
      const isMyReply = reply.id_creator_user === user?.id;
      if (!isMyReply) return;

      Alert.alert(
          "Gestione Messaggio",
          "Cosa vuoi fare?",
          [
              { text: "Annulla", style: "cancel" },
              { text: "Modifica", onPress: () => openEditReplyModal(reply) },
              { text: "Elimina", style: "destructive", onPress: () => confirmDeleteReply(reply) }
          ]
      );
  };

  const openEditReplyModal = (reply) => {
      setSelectedReply(reply);
      setEditReplyText(reply.body || reply.text || reply.messaggio);
      setEditReplyModalVisible(true);
  };

  const handleUpdateReply = async () => {
      if (!selectedReply || !editReplyText.trim()) return;

      setEditReplyModalVisible(false);
      setActionLoading(true);

      const success = await updateReply(ticket.id, selectedReply.id, editReplyText);
      
      setActionLoading(false);
      if (success) {
          fetchData(); // Ricarica messaggi
      } else {
          Alert.alert("Errore", "Impossibile modificare il messaggio.");
      }
  };

  const confirmDeleteReply = (reply) => {
      Alert.alert(
          "Elimina Messaggio",
          "Sei sicuro di voler eliminare questo messaggio?",
          [
              { text: "Annulla", style: "cancel" },
              { text: "Elimina", style: "destructive", onPress: async () => {
                  setActionLoading(true);
                  // Passiamo il body corrente perché richiesto dalle API per la DELETE
                  const bodyText = reply.body || reply.text || reply.messaggio;
                  const success = await deleteReply(ticket.id, reply.id, bodyText);
                  setActionLoading(false);
                  if (success) {
                      fetchData();
                  } else {
                      Alert.alert("Errore", "Impossibile eliminare il messaggio.");
                  }
              }}
          ]
      );
  };

  // --- AZIONI OPERATORE ---
  const handleStatusChange = async (newStatus, newStatusId) => {
    if (newStatus === 'Risolto') {
        setReportModalVisible(true);
        return;
    }

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

  const pickReportImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
        setReportImage(result.assets[0]);
    }
  };

  const handleSubmitReportAndClose = async () => {
      if (!interventionReport.trim()) {
          Alert.alert("Attenzione", "Il rapporto di intervento testuale è obbligatorio.");
          return;
      }

      setReportModalVisible(false);
      setActionLoading(true);

      try {
          const replyData = {
              body: `[RAPPORTO INTERVENTO]: ${interventionReport}`,
              type: 'REPORT'
          };

          await postReply(ticket.id, replyData, reportImage ? [reportImage] : []);
          // Chiudiamo il ticket (stato 3 o 4)
          const closeSuccess = await closeTicket(ticket.id);

          if (closeSuccess) {
              setInterventionReport('');
              setReportImage(null);
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

  // --- AZIONI RESPONSABILE ---
  const toggleEditMode = () => {
      if (isEditingTicket) {
          setEditTitle(ticket.titolo || ticket.title);
          setEditDesc(ticket.descrizione || ticket.description || ticket.desc);
          setIsEditingTicket(false);
      } else {
          setIsEditingTicket(true);
      }
  };

  const handleSaveTicketDetails = async () => {
      if (!editTitle.trim()) {
          Alert.alert("Errore", "Il titolo non può essere vuoto.");
          return;
      }

      setActionLoading(true);
      try {
          const success = await updateTicketDetails(ticket.id, {
              title: editTitle,
              description: editDesc,
          });

          if (success) {
              Alert.alert("Successo", "Dati ticket aggiornati.");
              setIsEditingTicket(false);
              fetchData();
          } else {
              Alert.alert("Errore", "Aggiornamento fallito.");
          }
      } catch (e) {
          console.error(e);
          Alert.alert("Errore", "Errore di connessione.");
      } finally {
          setActionLoading(false);
      }
  };
  
  const openAssignModal = async () => {
      setAssignModalVisible(true);
      if (operators.length === 0) {
          setLoadingOperators(true);
          try {
              const ops = await getOperatorsByTenant(); 
              setOperators(ops || []);
          } catch (e) {
              Alert.alert("Errore", "Impossibile caricare gli operatori.");
          } finally {
              setLoadingOperators(false);
          }
      }
  };

  const handleAssignOperator = async (operatorId) => {
      setAssignModalVisible(false);
      setActionLoading(true);
      try {
          const success = await assignTicket(ticket.id, operatorId);
          if (success) {
              Alert.alert("Assegnato", "Il ticket è stato assegnato all'operatore.");
              fetchData(); 
          } else {
              Alert.alert("Errore", "Assegnazione fallita.");
          }
      } catch (error) {
          console.error(error);
          Alert.alert("Errore", "Si è verificato un problema.");
      } finally {
          setActionLoading(false);
      }
  };

  const handleDeleteTicket = () => {
      Alert.alert("Elimina Ticket", "Sei sicuro di voler eliminare definitivamente questo ticket?", [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: 'destructive', onPress: async () => {
              setActionLoading(true);
              const success = await deleteTicket(ticket.id);
              setActionLoading(false);
              if (success) {
                  Alert.alert("Eliminato", "Ticket rimosso correttamente.");
                  navigation.goBack();
              } else {
                  Alert.alert("Errore", "Impossibile eliminare il ticket.");
              }
          }}
      ]);
  };

  const openMap = () => {
      if(ticket.lat && ticket.lon) {
          const url = Platform.select({
            ios: `maps:0,0?q=${ticket.lat},${ticket.lon}`,
            android: `geo:0,0?q=${ticket.lat},${ticket.lon}(Ticket)`
          });
          Linking.openURL(url);
      } else {
          Alert.alert("Info", "Coordinate non disponibili");
      }
  };

  // --- INVIO NUOVO MESSAGGIO ---
  const handleSendComment = async () => {
    if(!newComment.trim()) return;
    
    setActionLoading(true);
    
    const replyData = {
        body: newComment, 
        type: 'USER'
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

  const handleRating = async (stars) => {
    if(ratingSubmitted) return;

    Alert.alert("Valutazione", `Confermi una valutazione di ${stars} stelle?`, [
        { text: "Annulla", style: "cancel"},
        { text: "Invia", onPress: async () => {
            setRating(stars);
            setActionLoading(true);
            const success = await sendFeedback(ticket.id, stars);
            setActionLoading(false);
            
            if (success) {
                setRatingSubmitted(true);
                Alert.alert("Grazie!", "La tua valutazione è stata inviata.");
            } else {
                Alert.alert("Attenzione", "Impossibile salvare la valutazione sul server.");
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
        <Text style={styles.headerTitle}>Ticket #{ticket.id ? ticket.id.toString().slice(0,8) : '...'}</Text>
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
                <Text style={styles.catText}>
                    {Array.isArray(ticket.categories) && ticket.categories.length > 0 
                        ? ticket.categories[0].label 
                        : (ticket.category || 'Generico')}
                </Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
                <Text style={{color: getStatusTextColor(), fontWeight:'bold'}}>
                    {statusLabel.toUpperCase()}
                </Text>
            </View>
          </View>

          {/* EDIT MODE TICKET (MANAGER) */}
          {isEditingTicket ? (
              <View style={styles.editContainer}>
                  <Text style={styles.labelInput}>Modifica Titolo:</Text>
                  <TextInput 
                      style={styles.editInput} 
                      value={editTitle} 
                      onChangeText={setEditTitle} 
                  />
                  <Text style={styles.labelInput}>Modifica Descrizione:</Text>
                  <TextInput 
                      style={[styles.editInput, {height: 80, textAlignVertical:'top'}]} 
                      multiline
                      value={editDesc} 
                      onChangeText={setEditDesc} 
                  />
                  <View style={{flexDirection:'row', gap:10, marginTop:5}}>
                      <TouchableOpacity style={[styles.opBtn, {backgroundColor:'#ccc'}]} onPress={toggleEditMode}>
                          <Text style={{color:'black'}}>Annulla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.opBtn, {backgroundColor:'#10B981'}]} onPress={handleSaveTicketDetails}>
                          <Text style={{color:'white', fontWeight:'bold'}}>Salva</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          ) : (
              <>
                <Text style={styles.title}>{ticket.titolo || ticket.title}</Text>
                
                {/* INDIRIZZO E MAPPA */}
                <Text style={styles.address}>
                    <Ionicons name="location-outline" size={14} /> {ticket.indirizzo || ticket.address || 'Posizione non disponibile'}
                </Text>
                {ticket.lat && ticket.lon && (
                    <TouchableOpacity onPress={openMap} style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
                        <Ionicons name="map" size={16} color={COLORS.primary} />
                        <Text style={{color: COLORS.primary, marginLeft:5, fontWeight:'bold', fontSize:14}}>Vedi su Mappa</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.metaInfo}>
                    <Text style={styles.metaText}>
                        <Ionicons name="calendar-outline" size={12} /> {ticket.creation_date ? new Date(ticket.creation_date).toLocaleDateString() : 'Data N/D'}
                    </Text>
                    <Text style={styles.metaText}>
                        <Ionicons name="person-outline" size={12} /> {ticket.author_name || ticket.id_creator_user || 'Utente'}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.desc}>{ticket.descrizione || ticket.description || ticket.desc || "Nessuna descrizione."}</Text>
              </>
          )}

          {/* PANNELLI AZIONI */}
          {isOperator && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Pannello Operatore</Text>
                {actionLoading ? (
                    <ActivityIndicator color="#F59E0B" />
                ) : (
                    <View style={styles.opButtons}>
                        {!isResolved && !isInProgress && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#3B82F6', marginRight: 10}]} onPress={() => handleStatusChange('In Lavorazione', 2)}>
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

          {isManager && (
            <View style={styles.operatorPanel}>
                <Text style={[styles.opTitle, {color: '#B91C1C'}]}>Pannello Responsabile</Text>
                {actionLoading ? (
                    <ActivityIndicator color="#B91C1C" />
                ) : (
                    <View style={{gap: 10}}>
                        <View style={styles.opButtons}>
                            {!isResolved && (
                                <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#6366F1', marginRight: 10}]} onPress={openAssignModal}>
                                    <Ionicons name="person-add" size={18} color="white" />
                                    <Text style={styles.opBtnText}>ASSEGNA</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#EF4444'}]} onPress={handleDeleteTicket}>
                                <Ionicons name="trash" size={18} color="white" />
                                <Text style={styles.opBtnText}>ELIMINA</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {!isEditingTicket && !isResolved && (
                             <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#F59E0B'}]} onPress={toggleEditMode}>
                                 <Ionicons name="create" size={18} color="white" />
                                 <Text style={styles.opBtnText}>MODIFICA DATI</Text>
                             </TouchableOpacity>
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
          <Text style={{fontSize:10, color:'#666', marginBottom:5}}>Tieni premuto su un tuo messaggio per modificarlo.</Text>
          
          {replies.length === 0 ? (
              <View style={{padding:20, alignItems:'center'}}>
                  <Ionicons name="chatbubble-outline" size={24} color="#ccc"/>
                  <Text style={{color:'#999', fontStyle:'italic', marginTop:5}}>Nessun messaggio.</Text>
              </View>
          ) : (
              replies.map((r, i) => (
                <TouchableOpacity 
                    key={i} 
                    onLongPress={() => handleLongPressReply(r)} 
                    activeOpacity={0.8}
                    style={[styles.msgBox, r.id_creator_user === user?.id ? styles.msgMine : styles.msgOther]}
                >
                    <Text style={styles.msgUser}>
                        {r.user_name || (r.id_creator_user === user?.id ? 'Tu' : 'Utente')}
                    </Text>
                    <Text style={styles.msgText}>{r.body || r.text || r.messaggio}</Text>
                    <Text style={styles.msgDate}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</Text>
                </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      {/* INPUT BAR */}
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

      {/* MODALE REPORT */}
      <Modal
          animationType="slide"
          transparent={true}
          visible={reportModalVisible}
          onRequestClose={() => setReportModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rapporto di Intervento</Text>
                  <Text style={styles.modalSub}>Descrivi le operazioni effettuate.</Text>
                  
                  <TextInput 
                      style={styles.modalInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Descrizione tecnica..."
                      value={interventionReport}
                      onChangeText={setInterventionReport}
                  />

                  <TouchableOpacity style={styles.reportPhotoBtn} onPress={pickReportImage}>
                      {reportImage ? (
                          <View style={{flexDirection:'row', alignItems:'center'}}>
                              <Ionicons name="image" size={20} color="#10B981" />
                              <Text style={{marginLeft:10, color:'#333'}}>Foto allegata</Text>
                          </View>
                      ) : (
                          <View style={{flexDirection:'row', alignItems:'center'}}>
                              <Ionicons name="camera-outline" size={20} color="#555" />
                              <Text style={{marginLeft:10, color:'#555'}}>Allega Foto (Opzionale)</Text>
                          </View>
                      )}
                  </TouchableOpacity>

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

      {/* MODALE ASSEGNAZIONE */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={assignModalVisible}
          onRequestClose={() => setAssignModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {maxHeight: '80%'}]}>
                  <Text style={styles.modalTitle}>Assegna a Operatore</Text>
                  {loadingOperators ? (
                      <ActivityIndicator size="large" color={COLORS.primary} style={{margin: 20}} />
                  ) : operators.length === 0 ? (
                      <Text style={{textAlign:'center', margin:20, color:'#666'}}>Nessun operatore disponibile.</Text>
                  ) : (
                      <FlatList 
                          data={operators}
                          keyExtractor={(item) => item.id.toString()}
                          renderItem={({item}) => (
                              <TouchableOpacity style={styles.operatorItem} onPress={() => handleAssignOperator(item.id)}>
                                  <Ionicons name="person" size={20} color="#555" />
                                  <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
                              </TouchableOpacity>
                          )}
                      />
                  )}
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ccc', marginTop:15, alignSelf:'flex-end'}]} onPress={() => setAssignModalVisible(false)}>
                      <Text style={styles.modalBtnText}>Annulla</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* MODALE MODIFICA MESSAGGIO */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={editReplyModalVisible}
          onRequestClose={() => setEditReplyModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Modifica Messaggio</Text>
                  
                  <TextInput 
                      style={styles.modalInput}
                      multiline
                      value={editReplyText}
                      onChangeText={setEditReplyText}
                  />

                  <View style={styles.modalButtons}>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ccc'}]} onPress={() => setEditReplyModalVisible(false)}>
                          <Text style={styles.modalBtnText}>Annulla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#3B82F6'}]} onPress={handleUpdateReply}>
                          <Text style={styles.modalBtnText}>Aggiorna</Text>
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
  address: { color: '#666', marginBottom: 10, fontSize: 14 },
  
  metaInfo: { flexDirection: 'row', marginBottom: 20, borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:10 },
  metaText: { fontSize: 12, color: '#888', marginRight: 15 },

  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 10, letterSpacing: 1 },
  desc: { fontSize: 16, color: '#333', lineHeight: 24 },

  editContainer: { marginBottom: 15, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  labelInput: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  editInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 10 },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSub: { fontSize: 12, color: '#666', marginBottom: 15 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 15 },
  reportPhotoBtn: { flexDirection: 'row', alignItems:'center', justifyContent:'center', padding: 10, backgroundColor:'#F3F4F6', borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6 },
  modalBtnText: { color: 'white', fontWeight: 'bold' },
  operatorItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  operatorName: { marginLeft: 10, fontSize: 16, color: '#333' }
});