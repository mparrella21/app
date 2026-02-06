import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Linking, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/global';
import { API_BASE } from '../services/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOperatorsByTenant } from '../services/userService';
import { 
    getAssignments, 
    createAssignment, 
    deleteAssignment, 
    sendFeedback
} from '../services/interventionService';
import { 
    getTicket, 
    getAllReplies, 
    postReply, 
    updateReply, 
    deleteReply, 
    updateTicketDetails, 
    updateTicketStatus, 
    deleteTicket,
    getCategories
} from '../services/ticketService';
import { getAddressFromCoordinates } from '../services/nominatim';

export default function TicketDetailScreen({ route, navigation }) {
  const { id, ticket: paramTicket, tenant_id: paramTenantId } = route.params || {};
  const ticketId = id || paramTicket?.id;

  const { user } = useContext(AuthContext);
  
  const [ticket, setTicket] = useState(null);
  const [chatReplies, setChatReplies] = useState([]); 
  const [initialDescription, setInitialDescription] = useState(""); 
  const [coverImageId, setCoverImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [descriptionReplyId, setDescriptionReplyId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [chatImage, setChatImage] = useState(null); 
  const [editReplyModalVisible, setEditReplyModalVisible] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState(null);
  
  const [assignedOperator, setAssignedOperator] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [interventionReport, setInterventionReport] = useState('');
  const [reportImage, setReportImage] = useState(null);
  
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState(''); 
  const [categories, setCategories] = useState([]); 
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const effectiveTenantId = paramTenantId || ticket?.tenant_id || paramTicket?.tenant_id || user?.tenant_id;
  
  const toggleCategory = (catId) => {
    setSelectedCategoryIds(prev => {
        const sId = String(catId);
        if (prev.includes(sId)) {
            return prev.filter(item => item !== sId);
        } else {
            return [...prev, sId];
        }
    });
  };

  const fetchData = async () => {
    if (!ticketId || !effectiveTenantId) {
        setLoading(false);
        return;
    }
    if (!ticket) setLoading(true);

    try {
        const freshTicket = await getTicket(ticketId, effectiveTenantId);
        const allCats = await getCategories();
        setCategories(Array.isArray(allCats) ? allCats : []);

        if (freshTicket) {
            setTicket(freshTicket);
            setEditTitle(freshTicket.title || '');
            
            if (freshTicket.categories && Array.isArray(freshTicket.categories)) {
                const currentIds = freshTicket.categories.map(c => 
                    String(typeof c === 'object' ? c.id : c)
                );
                setSelectedCategoryIds(currentIds);
            }

            if (freshTicket.lat && freshTicket.lon && !freshTicket.location) {
                try {
                    const resolvedAddress = await getAddressFromCoordinates(parseFloat(freshTicket.lat), parseFloat(freshTicket.lon));
                    freshTicket.location = resolvedAddress;
                } catch (err) {}
            }

            // --- FIX RECUPERO ASSEGNAZIONE ---
            try {
                const allAssignments = await getAssignments(effectiveTenantId);
                const match = Array.isArray(allAssignments) 
                    ? allAssignments.find(a => String(a.id_ticket) === String(ticketId)) 
                    : null;

                if (match) {
                    const assignedId = match.id_user || match.user_id;
                    const ops = await getOperatorsByTenant(effectiveTenantId);
                    const op = Array.isArray(ops) ? ops.find(u => String(u.id) === String(assignedId)) : null;
                    
                    setAssignedOperator(op || { id: assignedId, name: 'Operatore', surname: 'Assegnato' });
                } else {
                    setAssignedOperator(null);
                }
            } catch (e) { 
                console.log("Errore recupero assegnazione:", e);
                setAssignedOperator(null); 
            }

            // Risposte
            const fetchedReplies = await getAllReplies(ticketId, effectiveTenantId);
            const sortedReplies = [...fetchedReplies].sort((a,b) => {
                const d1 = new Date(a.creation_date || a.created_at || a.date);
                const d2 = new Date(b.creation_date || b.created_at || b.date);
                return d1 - d2;
            });

            let descFound = false;
            let extractedDesc = "";
            let tempChat = [];
            let extractedCoverId = null;

            for (let r of sortedReplies) {
                const text = (r.body || r.text || r.messaggio || "").trim();
                const hasAttachments = r.attachments && r.attachments.length > 0;
                
                if (!descFound && text.length > 0 && !hasAttachments) {
                    extractedDesc = text;
                    setDescriptionReplyId(r.id);
                    descFound = true;
                    continue; 
                }
                if (hasAttachments && !extractedCoverId) {
                    const att = r.attachments[0];
                    extractedCoverId = typeof att === 'object' ? att.id : att;
                }
                tempChat.push(r);
            }

            setChatReplies(tempChat);
            setInitialDescription(extractedDesc); 
            setEditDesc(extractedDesc);
            setCoverImageId(extractedCoverId);
        }
    } catch (error) {
        Alert.alert("Errore", "Impossibile caricare i dettagli.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [ticketId, effectiveTenantId]);

  const statusId = ticket ? parseInt(ticket.id_status || ticket.status || 1) : 1;
  const isResolved = statusId >= 3;
  const isInProgress = statusId === 2;
  
  const userRole = user?.role ? user.role.toLowerCase() : '';
  const isOperator = userRole === 'operatore';
  const isCitizen = !user || userRole === 'cittadino';
  const isManager = userRole === 'responsabile' || userRole === 'admin' || userRole === 'manager';
  const isCreator = String(user?.id) === String(ticket?.id_creator_user);

  const isAssignedToMe = assignedOperator && String(user?.id) === String(assignedOperator.id);

  const coverImageUrl = coverImageId ? `${API_BASE}/media/static/upload/${coverImageId}.jpg` : null;

  // --- AZIONI ---

  const handleLongPressReply = (reply) => {
      const isMyMessage = String(reply.id_creator_user) === String(user?.id);
      if (!isMyMessage && !isManager) return;
      
      Alert.alert("Opzioni Messaggio", "", [
          { text: "Modifica", onPress: () => openEditReplyModal(reply) },
          { text: "Elimina", style: "destructive", onPress: () => confirmDeleteReply(reply) },
          { text: "Annulla", style: "cancel" }
      ]);
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
      const success = await updateReply(ticket.id, selectedReply.id, effectiveTenantId, editReplyText);
      setActionLoading(false);
      if (success) fetchData(); 
      else Alert.alert("Errore", "Impossibile modificare il messaggio.");
  };

  const confirmDeleteReply = async (reply) => {
      setActionLoading(true);
      const success = await deleteReply(ticket.id, reply.id, effectiveTenantId, user.id);
      setActionLoading(false);
      if (success) fetchData();
      else Alert.alert("Errore", "Impossibile eliminare il messaggio.");
  };

  const handleDeleteTicket = () => {
      Alert.alert(
          "Elimina Ticket", 
          "Sei sicuro di voler eliminare definitivamente questo ticket?",
          [
              { text: "Annulla", style: "cancel" },
              { text: "Elimina", style: "destructive", onPress: async () => {
                  setActionLoading(true);
                  const success = await deleteTicket(ticket.id, effectiveTenantId);
                  if(success) {
                      navigation.goBack();
                      Alert.alert("Eliminato", "Ticket rimosso correttamente.");
                  } else {
                      setActionLoading(false);
                      Alert.alert("Errore", "Impossibile eliminare il ticket.");
                  }
              }}
          ]
      );
  };

  const toggleEditMode = () => {
      if (isEditingTicket) {
          setEditTitle(ticket.title);
          setEditDesc(initialDescription);
          setIsEditingTicket(false);
      } else {
          setIsEditingTicket(true);
      }
  };

  const handleSaveTicketDetails = async () => {
    if (!editTitle.trim()) return;
    if (selectedCategoryIds.length === 0) {
        Alert.alert("Attenzione", "Devi selezionare almeno una categoria.");
        return;
    }

    setActionLoading(true);
    try {
        const originalOwnerId = ticket.id_creator_user || ticket.creator_id;
        
        const successTicket = await updateTicketDetails(
            ticket.id, 
            effectiveTenantId, 
            originalOwnerId, 
            {
                title: editTitle,
                categories: selectedCategoryIds 
            }
        );
        
        let successDesc = true;
        if (editDesc !== initialDescription) {
            if (descriptionReplyId) {
                successDesc = await updateReply(ticket.id, descriptionReplyId, effectiveTenantId, editDesc);
            } else if (editDesc.trim().length > 0) {
                successDesc = await postReply(ticket.id, effectiveTenantId, user.id, editDesc);
            }
        }

        if (successTicket && successDesc) {
            setIsEditingTicket(false);
            fetchData();
            Alert.alert("Successo", "Ticket aggiornato completamente.");
        } else {
            Alert.alert("Attenzione", "Alcuni dati potrebbero non essere stati salvati.");
            fetchData();
        }
    } catch (e) {
        Alert.alert("Errore", "Errore di connessione.");
    } finally {
        setActionLoading(false);
    }
  };

  // --- LOGICA RISOLUZIONE (Operatore) ---
  const handleSubmitReportAndClose = async () => {
      if (!interventionReport.trim()) return Alert.alert("Attenzione", "Descrizione obbligatoria.");
      
      setReportModalVisible(false);
      setActionLoading(true);

      try {
          const bodyText = `[RAPPORTO INTERVENTO]: ${interventionReport}`;
          const imagesToSend = reportImage ? [reportImage] : [];
          
          await postReply(ticket.id, effectiveTenantId, user.id, bodyText, imagesToSend); 
          
          // Cambio stato a 3 (Risolto)
          await updateTicketStatus(ticket.id, effectiveTenantId, user.id, 3); 

          setInterventionReport('');
          setReportImage(null);
          fetchData();
          Alert.alert("Completato", "Il ticket è stato risolto con successo.");
      } catch (e) {
          Alert.alert("Errore", "Chiusura fallita.");
      } finally { setActionLoading(false); }
  };

  const handleTakeCharge = async () => {
      setActionLoading(true);
      try {
          const success = await updateTicketStatus(ticket.id, effectiveTenantId, user.id, 2);
          if (success) {
              fetchData();
              Alert.alert("Successo", "Ticket preso in carico.");
          }
          else Alert.alert("Errore", "Impossibile aggiornare lo stato.");
      } catch (error) { Alert.alert("Errore", "Impossibile prendere in carico."); } 
      finally { setActionLoading(false); }
  };

  const handleSendComment = async () => {
    if(!newComment.trim() && !chatImage) return;
    Keyboard.dismiss();
    setActionLoading(true);
    await postReply(ticket.id, effectiveTenantId, user.id, newComment, chatImage ? [chatImage] : []);
    
    setActionLoading(false);
    setNewComment('');
    setChatImage(null);
    fetchData();
  };

  // --- NUOVA FUNZIONE GENERICA PER SCELTA FOTO ---
  // Accetta 'setFunction' che è la funzione di stato da aggiornare (es. setChatImage o setReportImage)
  const handleImagePick = async (setFunction) => {
    Alert.alert(
        "Aggiungi Foto",
        "Scegli una sorgente",
        [
            { 
                text: "Scatta Foto", 
                onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert("Permesso negato", "È necessario concedere l'accesso alla fotocamera.");
                        return;
                    }
                    let result = await ImagePicker.launchCameraAsync({
                        allowsEditing: true, // Libero da crop (o metti false per foto intera raw)
                        quality: 0.5,
                    });
                    if (!result.canceled) setFunction(result.assets[0]);
                }
            },
            { 
                text: "Galleria", 
                onPress: async () => {
                    let result = await ImagePicker.launchImageLibraryAsync({ 
                        mediaTypes: ['images'], 
                        quality: 0.5 
                    });
                    if (!result.canceled) setFunction(result.assets[0]);
                }
            },
            { text: "Annulla", style: "cancel" }
        ]
    );
  };

  const openAssignModal = async () => {
      setAssignModalVisible(true);
      if (operators.length === 0) {
          setLoadingOperators(true);
          try {
              const opList = await getOperatorsByTenant(effectiveTenantId);
              setOperators(opList || []);
          } catch (e) {} 
          finally { setLoadingOperators(false); }
      }
  };

  const handleAssignOperator = async (operatorId) => {
      setAssignModalVisible(false);
      setActionLoading(true);
      try {
          const success = await createAssignment(ticket.id, operatorId, effectiveTenantId);
          if (success) {
              fetchData();
              Alert.alert("Successo", "Ticket assegnato correttamente.");
          } 
          else Alert.alert("Errore", "Assegnazione fallita.");
      } catch (error) {} 
      finally { setActionLoading(false); }
  };
  
  const handleRemoveAssignment = async () => {
      if(!assignedOperator) return;
      Alert.alert("Rimuovi", "Vuoi rimuovere l'operatore?", [
          { text: "Annulla", style: "cancel" },
          { text: "Rimuovi", style: 'destructive', onPress: async () => {
              setActionLoading(true);
              try {
                  await deleteAssignment(ticket.id, assignedOperator.id, effectiveTenantId);
                  if (statusId === 2) {
                      await updateTicketStatus(ticket.id, effectiveTenantId, user.id, 1);
                  }
                  setAssignedOperator(null);
                  fetchData();
              } catch(e) {} 
              finally { setActionLoading(false); }
          }}
      ]);
  };

  const handleRating = async (stars) => {
    if(ratingSubmitted) return;
    let reportReply = null;
    for (let i = chatReplies.length - 1; i >= 0; i--) {
        const r = chatReplies[i];
        if (assignedOperator && String(r.id_creator_user) === String(assignedOperator.id)) {
            reportReply = r;
            break;
        }
        if (String(r.id_creator_user) !== String(ticket.id_creator_user)) {
            reportReply = r;
            break;
        }
    }

    if (!reportReply) {
        Alert.alert("Info", "Non è stato trovato un report operatore da votare.");
        return;
    }

    Alert.alert("Valutazione", `Confermi ${stars} stelle?`, [
        { text: "Annulla", style: "cancel"},
        { text: "Invia", onPress: async () => {
            setRating(stars);
            setActionLoading(true);
            const success = await sendFeedback(ticket.id, effectiveTenantId, stars, reportReply.id);
            setActionLoading(false);
            if (success) {
                setRatingSubmitted(true);
                Alert.alert("Grazie", "Feedback inviato.");
            }
            else Alert.alert("Errore", "Impossibile salvare il voto.");
        }}
    ]);
  };

  const openMap = () => {
      const lat = parseFloat(ticket.lat);
      const lon = parseFloat(ticket.lon);
      if(lat && lon) {
          const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lon}`,
            android: `geo:0,0?q=${lat},${lon}(Ticket)`
          });
          Linking.openURL(url);
      }
  };

  if (loading || !ticket) {
      return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      );
  }

  const getStatusText = () => {
      if (statusId === 1) return "APERTO";
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

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F3F4F6'}} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id.toString().slice(0,8)}</Text>
        <View style={{flexDirection:'row', marginLeft:'auto'}}>
            {!isResolved && (isManager || isCreator) && (
                <TouchableOpacity onPress={toggleEditMode} style={{padding:5, marginRight: 5}}>
                    <Ionicons name="create-outline" size={24} color="white" />
                </TouchableOpacity>
            )}
            {isManager && (
                <TouchableOpacity onPress={handleDeleteTicket} style={{padding:5}}>
                    <Ionicons name="trash-outline" size={24} color="#ffdddd" />
                </TouchableOpacity>
            )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {coverImageUrl ? (
          <TouchableOpacity onPress={() => setFullScreenImage(coverImageUrl)}>
             <Image source={{ uri: coverImageUrl }} style={styles.coverImg} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.coverImg, styles.placeholderImg]}>
            <Ionicons name="image-outline" size={50} color="white" />
            <Text style={{color:'white', marginTop:5}}>Nessuna foto</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={{flex: 1, marginRight: 10}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {ticket.categories && ticket.categories.length > 0 ? (
                        ticket.categories.map((c, index) => (
                            <View key={index} style={[styles.catBadge, {marginRight: 5}]}>
                                <Text style={styles.catText}>
                                    {typeof c === 'object' ? c.label : 'Cat ' + c}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.catBadge}>
                            <Text style={styles.catText}>Generico</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
                 <Text style={{color: getStatusTextColor(), fontWeight:'bold'}}>{getStatusText()}</Text>
            </View>
          </View>

          {isEditingTicket ? (
            <View style={styles.editContainer}>
                <Text style={styles.labelInput}>Titolo:</Text>
                <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} />
                <Text style={styles.labelInput}>Categorie:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {categories.map((c, idx) => {
                        const isSelected = selectedCategoryIds.includes(String(c.id));
                        return (
                            <TouchableOpacity key={idx} style={[styles.catBadge, { marginRight: 8 }, isSelected && { backgroundColor: COLORS.primary }]} onPress={() => toggleCategory(c.id)}>
                                <Text style={[styles.catText, isSelected && { color: 'white' }]}>{c.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <Text style={styles.labelInput}>Descrizione:</Text>
                <TextInput style={[styles.editInput, { height: 80 }]} multiline value={editDesc} onChangeText={setEditDesc} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                    <TouchableOpacity style={[styles.opBtn, { backgroundColor: '#ccc' }]} onPress={toggleEditMode}><Text>Annulla</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.opBtn, { backgroundColor: '#10B981' }]} onPress={handleSaveTicketDetails}><Text style={{ color: 'white' }}>Salva</Text></TouchableOpacity>
                </View>
            </View>
          ) : (
            <>
                <Text style={styles.title}>{ticket.title}</Text>
                <Text style={styles.address}><Ionicons name="location-outline" size={14} /> {ticket.location || 'Posizione non disponibile'}</Text>
                {ticket.lat && ticket.lon && (
                    <TouchableOpacity onPress={openMap} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <Ionicons name="map" size={16} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, marginLeft: 5, fontWeight: 'bold' }}>Vedi su Mappa</Text>
                    </TouchableOpacity>
                )}
                {assignedOperator && (
                    <View style={styles.assignedBox}>
                        <Ionicons name="person-circle" size={20} color="#6366F1" />
                        <Text style={styles.assignedText}>In carico a: <Text style={{ fontWeight: 'bold' }}>{assignedOperator.id} </Text></Text>
                    </View>
                )}
                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.desc}>{initialDescription || "Nessuna descrizione."}</Text>
            </>
          )}

          {/* PANNELLO OPERATORE */}
          {isOperator && isAssignedToMe && !isResolved && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Pannello Operatore</Text>
                <View style={styles.opButtons}>
                    {statusId === 1 && (
                         <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#3B82F6'}]} onPress={handleTakeCharge}>
                            <Text style={styles.opBtnText}>PRENDI IN CARICO</Text>
                        </TouchableOpacity>
                    )}
                    {statusId === 2 && (
                        <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => setReportModalVisible(true)}>
                            <Text style={styles.opBtnText}>COMPILA RAPPORTO E RISOLVI</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
          )}

          {/* PANNELLO MANAGER */}
          {isManager && (
            <View style={styles.operatorPanel}>
                <Text style={[styles.opTitle, {color: '#B91C1C'}]}>Admin Area</Text>
                 {!assignedOperator && !isResolved && statusId !== 2 && (
                     <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#6366F1'}]} onPress={openAssignModal}>
                        <Text style={styles.opBtnText}>ASSEGNA A OPERATORE</Text>
                    </TouchableOpacity>
                 )}
                 {assignedOperator && !isResolved && (
                    <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#B91C1C', marginTop: 5}]} onPress={handleRemoveAssignment}>
                        <Text style={styles.opBtnText}>RIMUOVI ASSEGNAZIONE</Text>
                    </TouchableOpacity>
                 )}
                 {!assignedOperator && statusId === 2 && (
                     <Text style={{fontStyle:'italic', color:'#666', fontSize:12, marginTop:5}}>Ticket "In Lavorazione" ma senza operatore. Assegnane uno per proseguire.</Text>
                 )}
            </View>
          )}

          {/* RATING */}
          {isResolved && isCitizen && !ratingSubmitted && (
            <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>Valuta l'intervento</Text>
                <View style={{flexDirection:'row', justifyContent:'center'}}>
                   {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={()=>handleRating(star)}>
                          <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" />
                      </TouchableOpacity>
                   ))}
                </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>MESSAGGI</Text>
          {chatReplies.length === 0 ? (
              <Text style={{color:'#999', fontStyle:'italic'}}>Nessun messaggio.</Text>
          ) : (
              chatReplies.map((r, i) => (
                <TouchableOpacity key={i} onLongPress={() => handleLongPressReply(r)} style={[styles.msgBox, String(r.id_creator_user) === String(user?.id) ? styles.msgMine : styles.msgOther]}>
                    <Text style={styles.msgUser}>{String(r.id_creator_user) === String(user?.id) ? 'Tu' : r.id_creator_user}</Text>
                    <Text style={styles.msgText}>{r.body || r.text}</Text>
                    {r.attachments && r.attachments.length > 0 && r.attachments.map((att, idx) => (
                        <TouchableOpacity key={idx} onPress={() => setFullScreenImage(`${API_BASE}/media/static/upload/${typeof att === 'object' ? att.id : att}.jpg`)}>
                            <Image source={{ uri: `${API_BASE}/media/static/upload/${typeof att === 'object' ? att.id : att}.jpg` }} style={{ width: 100, height: 70, marginTop: 5, borderRadius: 5 }} />
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      {!isResolved && (
          <View style={styles.inputArea}>
             {/* MODIFICATO: Chiama handleImagePick passando setChatImage */}
             <TouchableOpacity style={styles.cameraBtn} onPress={() => handleImagePick(setChatImage)}>
                 <Ionicons name="camera" size={24} color={COLORS.primary} />
             </TouchableOpacity>

             {/* Se c'è un'immagine selezionata per la chat, mostriamo un'anteprima/avviso */}
             {chatImage && (
                <View style={{marginRight: 10}}>
                    <Ionicons name="image" size={24} color="#10B981" />
                </View>
             )}

             <TextInput style={styles.input} placeholder="Scrivi..." value={newComment} onChangeText={setNewComment} />
             <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={20} color="white" />}
             </TouchableOpacity>
          </View>
      )}

      {/* MODALE RAPPORTO E RISOLUZIONE */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
           <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rapporto Intervento</Text>
                  <TextInput style={styles.modalInput} multiline value={interventionReport} onChangeText={setInterventionReport} placeholder="Descrivi intervento..." />
                  
                  {/* MODIFICATO: Chiama handleImagePick passando setReportImage */}
                  <TouchableOpacity onPress={() => handleImagePick(setReportImage)} style={styles.reportPhotoBtn}>
                      <Ionicons name="camera-outline" size={20} color="#666" style={{marginRight:5}} />
                      <Text>{reportImage ? 'Foto Allegata (Pronta)' : 'Allega Foto (Opzionale)'}</Text>
                  </TouchableOpacity>

                  <View style={styles.modalButtons}>
                      <TouchableOpacity onPress={()=>setReportModalVisible(false)} style={[styles.modalBtn, {backgroundColor:'#ccc'}]}><Text>Annulla</Text></TouchableOpacity>
                      <TouchableOpacity onPress={handleSubmitReportAndClose} style={[styles.modalBtn, {backgroundColor: COLORS.primary}]}><Text style={{color:'white', fontWeight:'bold'}}>CONFERMA RISOLUZIONE</Text></TouchableOpacity>
                  </View>
              </View>
           </View>
      </Modal>

      <Modal visible={assignModalVisible} transparent animationType="fade">
           <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {maxHeight: '80%'}]}>
                   <Text style={styles.modalTitle}>Scegli Operatore</Text>
                  <FlatList data={operators} keyExtractor={item=>String(item.id)} renderItem={({item}) => (
                      <TouchableOpacity style={styles.operatorItem} onPress={()=>handleAssignOperator(item.id)}>
                          <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
                      </TouchableOpacity>
                  )}/>
                  <TouchableOpacity onPress={()=>setAssignModalVisible(false)} style={{marginTop:10, alignSelf:'center'}}><Text style={{color:'red'}}>Annulla</Text></TouchableOpacity>
              </View>
           </View>
      </Modal>
      
      <Modal visible={editReplyModalVisible} transparent animationType="fade">
           <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Modifica Messaggio</Text>
                  <TextInput style={styles.modalInput} value={editReplyText} onChangeText={setEditReplyText} />
                  <View style={styles.modalButtons}>
                      <TouchableOpacity onPress={()=>setEditReplyModalVisible(false)} style={[styles.modalBtn, {backgroundColor:'#ccc'}]}><Text>Annulla</Text></TouchableOpacity>
                      <TouchableOpacity onPress={handleUpdateReply} style={[styles.modalBtn, {backgroundColor: COLORS.primary}]}><Text style={{color:'white'}}>Salva</Text></TouchableOpacity>
                  </View>
              </View>
           </View>
      </Modal>

      <Modal visible={fullScreenImage !== null} transparent={true} onRequestClose={() => setFullScreenImage(null)}>
          <View style={{flex: 1, backgroundColor: 'black'}}>
             <TouchableOpacity style={{position:'absolute', top:40, right:20, zIndex:10}} onPress={()=>setFullScreenImage(null)}><Ionicons name="close" size={40} color="white"/></TouchableOpacity>
             <Image source={{uri:fullScreenImage}} style={{flex:1}} resizeMode="contain" />
          </View>
      </Modal>

    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center' },
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
  assignedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', padding: 10, borderRadius: 8, marginBottom: 15 },
  assignedText: { color: '#3730A3', marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 10 },
  desc: { fontSize: 16, color: '#333', lineHeight: 24 },
  msgBox: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '85%' },
  msgOther: { backgroundColor: '#fff', alignSelf: 'flex-start', elevation: 1 },
  msgMine: { backgroundColor: '#E3F2FD', alignSelf: 'flex-end', elevation: 1 },
  msgUser: { fontWeight: 'bold', fontSize: 11, color: COLORS.primary, marginBottom: 2 },
  msgText: { color: '#333' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', elevation: 10, borderTopWidth: 1, borderTopColor: '#eee', alignItems:'center' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  cameraBtn: { marginRight: 10 },
  operatorPanel: { marginTop: 20, padding: 15, backgroundColor: '#FFF7E6', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  opTitle: { fontWeight: 'bold', color: '#B45309', marginBottom: 10, fontSize: 12 },
  opButtons: { flexDirection: 'row', gap: 5 },
  opBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  opBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  ratingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 2, marginTop: 20 },
  ratingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 15 },
  reportPhotoBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', padding: 15, backgroundColor:'#F3F4F6', borderRadius: 8, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6 },
  operatorItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  operatorName: { fontSize: 16 },
  editContainer: { marginBottom: 15, backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  labelInput: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  editInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 10 },
});