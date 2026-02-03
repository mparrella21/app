import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // RIPRISTINATO
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/global';

// IMPORT SERVIZI CORRETTI PER IL CICLO DI VITA
import { 
    getAssignmentByTicketId, 
    createAssignment,
    deleteAssignment,
    sendFeedback, 
    getRating
} from '../services/interventionService';

import { 
    getTicket,
    getAllReplies, 
    postReply, 
    updateReply, 
    deleteReply, 
    updateTicketDetails,
    updateTicketStatus,
    getCategories
} from '../services/ticketService';

import { getAllUsers } from '../services/userService'; 
import { getAddressFromCoordinates } from '../services/nominatim';

export default function TicketDetailScreen({ route, navigation }) {
  const { id, ticket: paramTicket } = route.params || {};
  const ticketId = id || paramTicket?.id;

  const { user } = useContext(AuthContext);
  
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // STATI PER LA CHAT
  const [newComment, setNewComment] = useState('');
  const [editReplyModalVisible, setEditReplyModalVisible] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');
  
  // STATI PER L'ASSEGNAZIONE (Responsabile)
  const [assignedOperator, setAssignedOperator] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // STATI PER IL RATING (Cittadino)
  const [rating, setRating] = useState(0); 
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // STATI PER LA CHIUSURA (Operatore)
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [interventionReport, setInterventionReport] = useState('');
  const [reportImage, setReportImage] = useState(null); // RIPRISTINATO
  
  // STATI PER LA MODIFICA TICKET
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState(''); // RIPRISTINATO
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [allCategories, setAllCategories] = useState([]);

  const fetchData = async () => {
      if (!ticketId) return;
      setLoading(true);
      
      try {
        const freshTicket = await getTicket(ticketId);
        
        if (freshTicket && freshTicket.lat && freshTicket.lon) {
            try {
                const resolvedAddress = await getAddressFromCoordinates(freshTicket.lat, freshTicket.lon);
                freshTicket.location = resolvedAddress;
            } catch (err) {
                console.warn("Impossibile risolvere indirizzo", err);
            }
        }

        setTicket(freshTicket);
        setEditTitle(freshTicket?.title || ''); 
        setEditDesc(freshTicket?.description || '');

        // LOGICA CORRETTA PER L'ASSEGNAZIONE
        try {
            const assignmentData = await getAssignmentByTicketId(ticketId);
            if(assignmentData && assignmentData.id_user) {
                const users = await getAllUsers();
                const op = users.find(u => u.id === assignmentData.id_user);
                setAssignedOperator(op || { id: assignmentData.id_user, name: 'Operatore', surname: '' });
            } else {
                setAssignedOperator(null);
            }
        } catch (e) {
            setAssignedOperator(null);
        }

        try {
            const fetchedRating = await getRating(ticketId);
            if (fetchedRating && fetchedRating.vote) {
                setRating(fetchedRating.vote);
                setRatingSubmitted(true);
            }
        } catch (e) {
            console.log("Nessun rating o errore fetch", e);
        }

        const fetchedReplies = await getAllReplies(ticketId);
        setReplies(fetchedReplies);

        if (user?.role === 'responsabile' || user?.role === 'operatore') {
            const cats = await getCategories();
            setAllCategories(cats);
        }

      } catch (error) {
        console.error("Errore fetch ticket detail", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  // STATI: 1: Ricevuto, 2: In Lavorazione, 3: Risolto, 4: Chiuso
  const statusId = ticket?.id_status || 1;
  const isResolved = statusId >= 3;
  const isInProgress = statusId === 2;
  
  const isOperator = user?.role === 'operatore';
  const isCitizen = !user || user?.role === 'cittadino';
  const isManager = user?.role === 'responsabile'; 

  const handleLongPressReply = (reply) => {
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
      if (success) fetchData(); 
      else Alert.alert("Errore", "Impossibile modificare il messaggio.");
  };

  const confirmDeleteReply = (reply) => {
      Alert.alert(
          "Elimina Messaggio",
          "Sei sicuro di voler eliminare questo messaggio?",
          [
              { text: "Annulla", style: "cancel" },
              { text: "Elimina", style: "destructive", onPress: async () => {
                  setActionLoading(true);
                  const bodyText = reply.body || reply.text || reply.messaggio;
                  const success = await deleteReply(ticket.id, reply.id, bodyText);
                  setActionLoading(false);
                  if (success) fetchData();
                  else Alert.alert("Errore", "Impossibile eliminare il messaggio.");
              }}
          ]
      );
  };

  const handleSendComment = async () => {
    if(!newComment.trim()) return;
    setActionLoading(true);
    const replyData = { body: newComment, type: 'USER' };
    const success = await postReply(ticket.id, replyData);
    setActionLoading(false);

    if (success) {
        setNewComment('');
        fetchData(); 
    } else {
        Alert.alert("Errore", "Impossibile inviare il messaggio.");
    }
  };

  // OPERATORE: PRENDE IN CARICO
  const handleTakeCharge = async () => {
    Alert.alert("Inizia Lavoro", "Vuoi iniziare le operazioni per questo ticket? Lo stato passerà a 'In Lavorazione'.", [
        { text: "Annulla", style: "cancel" },
        { text: "Conferma", onPress: async () => {
            setActionLoading(true);
            try {
                await updateTicketStatus(ticket.id, 2);
                fetchData();
                Alert.alert("Successo", "Intervento in corso.");
            } catch (error) {
                Alert.alert("Errore", "Impossibile aggiornare lo stato.");
            } finally {
                setActionLoading(false);
            }
        }}
    ]);
  };

  // RIPRISTINATA FUNZIONE IMMAGINE
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

  // OPERATORE: CHIUSURA E REPORT
  const handleSubmitReportAndClose = async () => {
      if (!interventionReport.trim()) {
          Alert.alert("Attenzione", "Il rapporto di intervento testuale è obbligatorio.");
          return;
      }

      setReportModalVisible(false);
      setActionLoading(true);

      try {
          const replyData = { body: `[RAPPORTO INTERVENTO]: ${interventionReport}`, type: 'REPORT' };
          await postReply(ticket.id, replyData, reportImage ? [reportImage] : []);

          await updateTicketStatus(ticket.id, 3);

          setInterventionReport('');
          setReportImage(null);
          fetchData();
          Alert.alert("Ticket Chiuso", "L'intervento è stato registrato come risolto.");
      } catch (e) {
          Alert.alert("Errore", "Si è verificato un problema durante la chiusura.");
      } finally {
          setActionLoading(false);
      }
  };

  const toggleEditMode = () => {
      if (isEditingTicket) {
          setEditTitle(ticket.title);
          setEditDesc(ticket.description || "");
          setIsEditingTicket(false);
      } else {
          setIsEditingTicket(true);
      }
  };

  const handleSaveTicketDetails = async () => {
      if (!editTitle.trim()) return;

      setActionLoading(true);
      try {
          const success = await updateTicketDetails(ticket.id, {
              title: editTitle,
              description: editDesc,
              categories: editCategoryId ? [editCategoryId] : []
          });

          if (success) {
              Alert.alert("Successo", "Dati ticket aggiornati.");
              setIsEditingTicket(false);
              fetchData();
          } else Alert.alert("Errore", "Aggiornamento fallito.");
      } catch (e) {
          Alert.alert("Errore", "Errore di connessione.");
      } finally {
          setActionLoading(false);
      }
  };
  
  // ==========================================
  // AZIONI RESPONSABILE: Assegnazione
  // ==========================================
  const openAssignModal = async () => {
      setAssignModalVisible(true);
      if (operators.length === 0) {
          setLoadingOperators(true);
          try {
              const users = await getAllUsers();
              const opList = users.filter(u => u.role === 'operatore' || u.role === 2);
              setOperators(opList || []);
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
          const success = await createAssignment(ticket.id, operatorId);
          if (success) {
              Alert.alert("Assegnato", "Il ticket è stato assegnato all'operatore.");
              fetchData(); 
          } else {
              Alert.alert("Errore", "Assegnazione fallita.");
          }
      } catch (error) {
          Alert.alert("Errore", "Assegnazione fallita.");
      } finally {
          setActionLoading(false);
      }
  };

  const handleRemoveAssignment = () => {
      Alert.alert("Rimuovi Assegnazione", "Vuoi rimuovere l'operatore? L'intervento verrà interrotto.", [
          { text: "Annulla", style: "cancel" },
          { text: "Rimuovi", style: 'destructive', onPress: async () => {
              setActionLoading(true);
              try {
                  await deleteAssignment(ticket.id);
                  await updateTicketStatus(ticket.id, 1);
                  Alert.alert("Successo", "Assegnazione rimossa.");
                  setAssignedOperator(null);
                  fetchData();
              } catch(e) {
                  Alert.alert("Errore", "Impossibile rimuovere l'assegnazione.");
              } finally {
                  setActionLoading(false);
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
      } else Alert.alert("Info", "Coordinate non disponibili");
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
            } else Alert.alert("Attenzione", "Impossibile salvare la valutazione sul server.");
        }}
    ]);
  };

  if (loading || !ticket) {
      return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{marginTop:10, color:'#666'}}>Caricamento Ticket...</Text>
        </View>
      );
  }

  const getStatusText = () => {
      if (statusId === 1) return "RICEVUTO";
      if (statusId === 2) return "IN LAVORAZIONE";
      if (statusId === 3) return "RISOLTO";
      return "CHIUSO";
  };

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

  const catLabel = (ticket.categories && ticket.categories.length > 0) ? ticket.categories[0].label : 'Generico';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, backgroundColor:'#F3F4F6'}}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id.toString().slice(0,8)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {ticket.images && ticket.images.length > 0 ? (
          <Image source={{ uri: ticket.images[0] }} style={styles.coverImg} />
        ) : (
          <View style={[styles.coverImg, styles.placeholderImg]}>
            <Ionicons name="image-outline" size={50} color="white" />
            <Text style={{color:'white', marginTop:5}}>Nessuna foto</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}>
                <Text style={styles.catText}>{catLabel}</Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
                <Text style={{color: getStatusTextColor(), fontWeight:'bold'}}>
                    {getStatusText()}
                </Text>
            </View>
          </View>

          {isEditingTicket ? (
              <View style={styles.editContainer}>
                  <Text style={styles.labelInput}>Modifica Titolo:</Text>
                  <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} />
                  
                  <Text style={styles.labelInput}>Modifica Categoria:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                      {allCategories.map(cat => (
                          <TouchableOpacity key={cat.id} style={[styles.catSelectBtn, editCategoryId === cat.id && styles.catSelectBtnActive]} onPress={() => setEditCategoryId(cat.id)}>
                              <Text style={[styles.catSelectText, editCategoryId === cat.id && styles.catSelectTextActive]}>{cat.label}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  {/* CAMPO DESCRIZIONE RIPRISTINATO */}
                  <Text style={styles.labelInput}>Modifica Descrizione:</Text>
                  <TextInput style={[styles.editInput, {height: 80, textAlignVertical:'top'}]} multiline value={editDesc} onChangeText={setEditDesc} />
                  
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
                <Text style={styles.title}>{ticket.title}</Text>
                
                <Text style={styles.address}>
                    <Ionicons name="location-outline" size={14} /> {ticket.location || 'Posizione non disponibile'}
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
                    {/* INFO UTENTE RIPRISTINATE */}
                    <Text style={styles.metaText}>
                        <Ionicons name="person-outline" size={12} /> {ticket.creator_id || 'Utente'}
                    </Text>
                </View>

                {assignedOperator && (
                    <View style={styles.assignedBox}>
                        <Ionicons name="person-circle" size={20} color="#6366F1" />
                        <Text style={styles.assignedText}>
                            Assegnato a: <Text style={{fontWeight:'bold'}}>{assignedOperator.name} {assignedOperator.surname}</Text>
                        </Text>
                    </View>
                )}

                {/* DESCRIZIONE RIPRISTINATA */}
                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.desc}>{ticket.description || "Nessuna descrizione."}</Text>
              </>
          )}

          {/* PANNELLO OPERATORE */}
          {isOperator && assignedOperator && user.id === assignedOperator.id && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Pannello Operatore</Text>
                {actionLoading ? (
                    <ActivityIndicator color="#F59E0B" />
                ) : (
                    <View style={styles.opButtons}>
                        {statusId === 1 && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#3B82F6', marginRight: 10}]} onPress={handleTakeCharge}>
                                <Ionicons name="construct" size={18} color="white" />
                                <Text style={styles.opBtnText}>INIZIA LAVORO</Text>
                            </TouchableOpacity>
                        )}

                        {statusId === 2 && (
                            <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => setReportModalVisible(true)}>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.opBtnText}>RISOLTO</Text>
                            </TouchableOpacity>
                        )}
                        
                        {isResolved && (
                            <Text style={{color:'#10B981', fontWeight:'bold', textAlign:'center', flex:1}}>
                                <Ionicons name="lock-closed" size={14}/> Ticket Chiuso
                            </Text>
                        )}
                    </View>
                )}
            </View>
          )}

          {/* PANNELLO RESPONSABILE */}
          {isManager && (
            <View style={styles.operatorPanel}>
                <Text style={[styles.opTitle, {color: '#B91C1C'}]}>Pannello Responsabile</Text>
                {actionLoading ? (
                    <ActivityIndicator color="#B91C1C" />
                ) : (
                    <View style={{gap: 10}}>
                        <View style={styles.opButtons}>
                            {!isResolved && !assignedOperator && (
                                <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#6366F1', marginRight: 10}]} onPress={openAssignModal}>
                                    <Ionicons name="person-add" size={18} color="white" />
                                    <Text style={styles.opBtnText}>ASSEGNA</Text>
                                </TouchableOpacity>
                            )}

                            {assignedOperator && !isResolved && (
                                <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#B91C1C', marginRight: 10}]} onPress={handleRemoveAssignment}>
                                    <Ionicons name="person-remove" size={18} color="white" />
                                    <Text style={styles.opBtnText}>RIMUOVI OP.</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        {!isEditingTicket && !isResolved && (
                             <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#F59E0B'}]} onPress={toggleEditMode}>
                                 <Ionicons name="create" size={18} color="white" />
                                 <Text style={styles.opBtnText}>MODIFICA DATI TICKET</Text>
                             </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
          )}

          {/* RATING CITTADINO */}
          {isResolved && isCitizen && (
            <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>
                    {ratingSubmitted ? "Grazie per il tuo feedback!" : "Valuta l'intervento"}
                </Text>
                <View style={{flexDirection:'row', justifyContent:'center'}}>
                   {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={()=>handleRating(star)} disabled={ratingSubmitted}>
                          <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color={ratingSubmitted ? "#FFC107" : "#FFD700"} style={{marginHorizontal:4, opacity: ratingSubmitted ? 0.8 : 1}} />
                      </TouchableOpacity>
                   ))}
                </View>
                <Text style={styles.ratingSub}>
                    {ratingSubmitted ? "Valutazione registrata" : "Tocca le stelle per valutare"}
                </Text>
            </View>
          )}

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

      {!isResolved && (
          <View style={styles.inputArea}>
             <TextInput style={styles.input} placeholder="Scrivi un aggiornamento..." value={newComment} onChangeText={setNewComment} />
             <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="send" size={20} color="white" />}
             </TouchableOpacity>
          </View>
      )}

      {/* MODALE REPORT RIPRISTINATO CON FOTO */}
      <Modal animationType="slide" transparent={true} visible={reportModalVisible} onRequestClose={() => setReportModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rapporto di Intervento</Text>
                  <Text style={styles.modalSub}>Descrivi le operazioni effettuate.</Text>
                  
                  <TextInput style={styles.modalInput} multiline numberOfLines={4} placeholder="Descrizione tecnica..." value={interventionReport} onChangeText={setInterventionReport} />

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
      <Modal animationType="fade" transparent={true} visible={assignModalVisible} onRequestClose={() => setAssignModalVisible(false)}>
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

      {/* MODALE EDIT MESSAGGIO */}
      <Modal animationType="fade" transparent={true} visible={editReplyModalVisible} onRequestClose={() => setEditReplyModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Modifica Messaggio</Text>
                  <TextInput style={styles.modalInput} multiline value={editReplyText} onChangeText={setEditReplyText} />
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

  assignedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', padding: 10, borderRadius: 8, marginBottom: 15 },
  assignedText: { color: '#3730A3', marginLeft: 8, fontSize: 14 },

  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 10, letterSpacing: 1 },
  desc: { fontSize: 16, color: '#333', lineHeight: 24 },

  editContainer: { marginBottom: 15, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  labelInput: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  editInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 10 },
  catSelectBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: '#E5E7EB', marginRight: 8 },
  catSelectBtnActive: { backgroundColor: COLORS.primary || '#D32F2F' },
  catSelectText: { fontSize: 12, color: '#374151' },
  catSelectTextActive: { color: 'white', fontWeight: 'bold' },

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