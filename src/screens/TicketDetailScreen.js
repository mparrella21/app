import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Linking, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/global';
import { API_BASE } from '../services/config'; 
// IMPORTANTE: SafeAreaView serve per il layout corretto
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const { id, ticket: paramTicket, tenant_id: paramTenantId } = route.params || {};
  const ticketId = id || paramTicket?.id;

  const { user } = useContext(AuthContext);
  
  const [ticket, setTicket] = useState(null);
  
  // LOGICA FILTRO
  const [chatReplies, setChatReplies] = useState([]); 
  const [initialDescription, setInitialDescription] = useState(""); 
  const [coverImageId, setCoverImageId] = useState(null); 

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // CHAT + FOTO
  const [newComment, setNewComment] = useState('');
  const [chatImage, setChatImage] = useState(null); 
  const [editReplyModalVisible, setEditReplyModalVisible] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');

  // --- NUOVO STATO: IMMAGINE FULL SCREEN ---
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
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [allCategories, setAllCategories] = useState([]);

  const effectiveTenantId = paramTenantId || ticket?.tenant_id || paramTicket?.tenant_id || user?.tenant_id;

  const fetchData = async () => {
      if (!ticketId || !effectiveTenantId) {
          setLoading(false);
          return;
      }
      if(!ticket) setLoading(true);
      
      try {
        const freshTicket = await getTicket(ticketId, effectiveTenantId);
        
        if (freshTicket && freshTicket.lat && freshTicket.lon && !freshTicket.location) {
            try {
                const resolvedAddress = await getAddressFromCoordinates(parseFloat(freshTicket.lat), parseFloat(freshTicket.lon));
                freshTicket.location = resolvedAddress;
            } catch (err) {}
        }

        setTicket(freshTicket);
        setEditTitle(freshTicket?.title || ''); 
        
        if (freshTicket.categories && freshTicket.categories.length > 0) {
            const firstCat = freshTicket.categories[0];
            setEditCategoryId(typeof firstCat === 'object' ? firstCat.id : firstCat);
        }

        try {
            const assignmentData = await getAssignmentByTicketId(ticketId, effectiveTenantId);
            const assignedId = assignmentData?.user_id || assignmentData?.id_user;

            if(assignmentData && assignedId) {
                const users = await getAllUsers();
                const op = users.find(u => u.id === assignedId);
                setAssignedOperator(op || { id: assignedId, name: 'Operatore', surname: '' });
            } else {
                setAssignedOperator(null);
            }
        } catch (e) { setAssignedOperator(null); }

        try {
            const fetchedRating = await getRating(ticketId, effectiveTenantId);
            if (fetchedRating && fetchedRating.vote) {
                setRating(fetchedRating.vote);
                setRatingSubmitted(true);
            }
        } catch (e) { }

        // --- GESTIONE REPLIES INTELLIGENTE ---
        const fetchedReplies = await getAllReplies(ticketId, effectiveTenantId);
        const sortedReplies = [...fetchedReplies].sort((a,b) => {
             // Gestione robusta date (backend potrebbe usare nomi diversi)
             const d1 = new Date(a.creation_date || a.created_at || a.date);
             const d2 = new Date(b.creation_date || b.created_at || b.date);
             return d1 - d2;
        });

        let descFound = false;
        let coverFound = false;
        let tempChat = [];
        let extractedDesc = "";
        let extractedCoverId = null;

        for (let r of sortedReplies) {
            const text = (r.body || r.text || r.messaggio || "").trim();
            const hasAttachments = r.attachments && r.attachments.length > 0;
            const titleText = (freshTicket.title || "").trim();

            if (text === "" && !hasAttachments) continue; 
            if (text.toLowerCase() === titleText.toLowerCase() && !hasAttachments) continue;

            let isConsumed = false;

            if (!descFound && text.length > 0 && !hasAttachments) {
                extractedDesc = text;
                descFound = true;
                isConsumed = true; 
            }

            if (!coverFound && hasAttachments) {
                const att = r.attachments[0];
                extractedCoverId = (typeof att === 'object') ? att.id : att;
                coverFound = true;
                if (text === "" || text === "Foto allegata") {
                    isConsumed = true;
                }
            }

            if (!isConsumed) tempChat.push(r);
        }

        setChatReplies(tempChat);
        setInitialDescription(extractedDesc || "Nessuna descrizione aggiuntiva.");
        setEditDesc(extractedDesc); 
        setCoverImageId(extractedCoverId);

        if (user?.role === 'responsabile' || user?.role === 'operatore') {
            const cats = await getCategories();
            setAllCategories(cats);
        }

      } catch (error) {
        Alert.alert("Errore", "Impossibile caricare i dettagli.");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => { fetchData(); }, [ticketId, effectiveTenantId]);

  const statusId = ticket?.id_status || 1;
  const isResolved = statusId >= 3;
  const isInProgress = statusId === 2;
  
  const isOperator = user?.role === 'operatore';
  const isCitizen = !user || user?.role === 'cittadino';
  const isManager = user?.role === 'responsabile'; 

  const coverImageUrl = coverImageId ? `${API_BASE}/media/static/upload/${coverImageId}.jpg` : null;

  const handleLongPressReply = (reply) => {
      if (reply.id_creator_user !== user?.id) return;
      Alert.alert("Opzioni", "", [
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
      else Alert.alert("Errore", "Impossibile modificare.");
  };

  const confirmDeleteReply = async (reply) => {
      setActionLoading(true);
      const success = await deleteReply(ticket.id, reply.id, effectiveTenantId, user.id);
      setActionLoading(false);
      if (success) fetchData();
      else Alert.alert("Errore", "Impossibile eliminare.");
  };

  const pickChatImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled) setChatImage(result.assets[0]);
  };

  const handleSendComment = async () => {
    if(!newComment.trim() && !chatImage) {
        Alert.alert("Attenzione", "Scrivi qualcosa o allega una foto.");
        return;
    }
    
    Keyboard.dismiss();
    setActionLoading(true);
    
    let textSuccess = true;
    let imageSuccess = true;

    if (newComment.trim()) {
        const res = await postReply(ticket.id, effectiveTenantId, user.id, newComment);
        if(!res) {
            console.error("Fallito invio testo");
            textSuccess = false;
        }
    }

    if (chatImage) {
        const res = await postReply(ticket.id, effectiveTenantId, user.id, "", [chatImage]);
        if(!res) {
            console.error("Fallito invio foto");
            imageSuccess = false;
        }
    }
    
    setActionLoading(false);

    if (textSuccess && imageSuccess) {
        setNewComment('');
        setChatImage(null);
        fetchData(); 
    } else {
        let msg = "Invio fallito.";
        if (!textSuccess && !imageSuccess) msg = "Impossibile inviare messaggio e foto.";
        else if (!textSuccess) msg = "Testo non inviato. Riprova.";
        else if (!imageSuccess) {
            msg = "Testo inviato, ma foto fallita.";
            setNewComment(''); 
            fetchData();
        }
        Alert.alert("Errore", msg);
    }
  };

  const handleTakeCharge = async () => {
      setActionLoading(true);
      try {
          await updateTicketStatus(ticket.id, effectiveTenantId, 2);
          fetchData();
      } catch (error) { Alert.alert("Errore", "Impossibile aggiornare."); } 
      finally { setActionLoading(false); }
  };

  const pickReportImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled) setReportImage(result.assets[0]);
  };

  const handleSubmitReportAndClose = async () => {
      if (!interventionReport.trim()) return Alert.alert("Attenzione", "Descrizione obbligatoria.");
      setReportModalVisible(false);
      setActionLoading(true);

      try {
          const bodyText = `[RAPPORTO]: ${interventionReport}`;
          const imagesToSend = reportImage ? [reportImage] : [];
          
          await postReply(ticket.id, effectiveTenantId, user.id, bodyText, imagesToSend); 
          await updateTicketStatus(ticket.id, effectiveTenantId, 3);

          setInterventionReport('');
          setReportImage(null);
          fetchData();
      } catch (e) {
          Alert.alert("Errore", "Chiusura fallita.");
      } finally { setActionLoading(false); }
  };

  const toggleEditMode = () => {
      if (isEditingTicket) {
          setEditTitle(ticket.title);
          setEditDesc(initialDescription);
          setIsEditingTicket(false);
      } else setIsEditingTicket(true);
  };

  const handleSaveTicketDetails = async () => {
      if (!editTitle.trim()) return;
      setActionLoading(true);
      try {
          const success = await updateTicketDetails(ticket.id, effectiveTenantId, {
              title: editTitle,
              description: editDesc, 
              categories: editCategoryId ? [editCategoryId] : []
          });
          if (success) {
              setIsEditingTicket(false);
              fetchData();
          } else Alert.alert("Errore", "Aggiornamento fallito.");
      } catch (e) { Alert.alert("Errore", "Errore connessione."); } 
      finally { setActionLoading(false); }
  };
  
  const openAssignModal = async () => {
      setAssignModalVisible(true);
      if (operators.length === 0) {
          setLoadingOperators(true);
          try {
              const users = await getAllUsers();
              const opList = users.filter(u => u.role === 'operatore' || u.role === 2);
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
          if (success) fetchData(); 
          else Alert.alert("Errore", "Assegnazione fallita.");
      } catch (error) {} 
      finally { setActionLoading(false); }
  };

  const handleRemoveAssignment = () => {
      Alert.alert("Rimuovi", "Vuoi rimuovere l'operatore?", [
          { text: "Annulla", style: "cancel" },
          { text: "Rimuovi", style: 'destructive', onPress: async () => {
              setActionLoading(true);
              try {
                  await deleteAssignment(ticket.id, assignedOperator.id, effectiveTenantId);
                  await updateTicketStatus(ticket.id, effectiveTenantId, 1);
                  setAssignedOperator(null);
                  fetchData();
              } catch(e) {} 
              finally { setActionLoading(false); }
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
      } else Alert.alert("Info", "Coordinate non disponibili");
  };

  const handleRating = async (stars) => {
    if(ratingSubmitted) return;
    Alert.alert("Valutazione", `Confermi ${stars} stelle?`, [
        { text: "Annulla", style: "cancel"},
        { text: "Invia", onPress: async () => {
            setRating(stars);
            setActionLoading(true);
            const reportReplyId = chatReplies.length > 0 ? chatReplies[chatReplies.length - 1].id : null; 
            const success = await sendFeedback(ticket.id, effectiveTenantId, stars, reportReplyId);
            setActionLoading(false);
            if (success) setRatingSubmitted(true);
            else Alert.alert("Attenzione", "Impossibile salvare.");
        }}
    ]);
  };

  if (loading || !ticket) {
      return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
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
  const formattedDate = ticket.creation_date 
        ? new Date(ticket.creation_date).toLocaleDateString() 
        : (ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Data N/D');

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F3F4F6'}} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView 
            style={{flex: 1}}
            behavior={Platform.OS === "ios" ? "padding" : undefined} 
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id.toString().slice(0,8)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* FOTO COPERTINA CLICCABILE */}
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
                  <Text style={styles.labelInput}>Titolo:</Text>
                  <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} />
                  <Text style={styles.labelInput}>Descrizione:</Text>
                  <TextInput style={[styles.editInput, {height: 80}]} multiline value={editDesc} onChangeText={setEditDesc} />
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
                    <Text style={styles.metaText}>{formattedDate}</Text>
                    <Text style={styles.metaText}><Ionicons name="person" size={12}/> {ticket.id_creator_user ? 'Utente App' : 'Sistema'}</Text>
                </View>

                {assignedOperator && (
                    <View style={styles.assignedBox}>
                        <Ionicons name="person-circle" size={20} color="#6366F1" />
                        <Text style={styles.assignedText}>
                            Assegnato a: <Text style={{fontWeight:'bold'}}>{assignedOperator.name} {assignedOperator.surname}</Text>
                        </Text>
                    </View>
                )}
                
                <Text style={styles.sectionTitle}>DESCRIZIONE</Text>
                <Text style={styles.desc}>{initialDescription}</Text>
              </>
          )}

          {/* ... (OPERATOR PANEL E MANAGER PANEL UGUALI) ... */}
          {isOperator && assignedOperator && user.id === assignedOperator.id && (
            <View style={styles.operatorPanel}>
                <Text style={styles.opTitle}>Pannello Operatore</Text>
                <View style={styles.opButtons}>
                    {statusId === 1 && (
                        <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#3B82F6'}]} onPress={handleTakeCharge}>
                            <Text style={styles.opBtnText}>INIZIA LAVORO</Text>
                        </TouchableOpacity>
                    )}
                    {statusId === 2 && (
                        <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#10B981'}]} onPress={() => setReportModalVisible(true)}>
                            <Text style={styles.opBtnText}>RISOLTO</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
          )}

          {isManager && (
            <View style={styles.operatorPanel}>
                <Text style={[styles.opTitle, {color: '#B91C1C'}]}>Admin</Text>
                {!assignedOperator && (
                    <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#6366F1'}]} onPress={openAssignModal}>
                        <Text style={styles.opBtnText}>ASSEGNA</Text>
                    </TouchableOpacity>
                )}
                {assignedOperator && (
                    <TouchableOpacity style={[styles.opBtn, {backgroundColor: '#B91C1C'}]} onPress={handleRemoveAssignment}>
                        <Text style={styles.opBtnText}>RIMUOVI OP.</Text>
                    </TouchableOpacity>
                )}
            </View>
          )}

          {isResolved && isCitizen && (
            <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>Valuta l'intervento</Text>
                <View style={{flexDirection:'row', justifyContent:'center'}}>
                   {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={()=>handleRating(star)} disabled={ratingSubmitted}>
                          <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color={ratingSubmitted ? "#FFC107" : "#FFD700"} />
                      </TouchableOpacity>
                   ))}
                </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>MESSAGGI</Text>
          {chatReplies.length === 0 ? (
              <View style={{padding:20, alignItems:'center'}}>
                  <Ionicons name="chatbubble-outline" size={24} color="#ccc"/>
                  <Text style={{color:'#999', fontStyle:'italic', marginTop:5}}>Nessun messaggio.</Text>
              </View>
          ) : (
              chatReplies.map((r, i) => (
                <TouchableOpacity key={i} onLongPress={() => handleLongPressReply(r)} style={[styles.msgBox, r.id_creator_user === user?.id ? styles.msgMine : styles.msgOther]}>
                    <Text style={styles.msgUser}>{r.user_name || (r.id_creator_user === user?.id ? 'Tu' : 'Utente')}</Text>
                    <Text style={styles.msgText}>{r.body || r.text || r.messaggio}</Text>
                    
                    {/* FOTO NELLA CHAT CLICCABILE */}
                    {r.attachments && r.attachments.length > 0 && (
                        <View style={{marginTop:5}}>
                            {r.attachments.map((att, idx) => {
                                const imgId = (typeof att === 'object') ? att.id : att;
                                const imgUrl = `${API_BASE}/media/static/upload/${imgId}.jpg`;
                                return (
                                    <TouchableOpacity key={idx} onPress={() => setFullScreenImage(imgUrl)}>
                                        <Image source={{ uri: imgUrl }} style={{ width: 150, height: 100, borderRadius: 5, marginTop: 5 }} resizeMode="cover"/>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <Text style={styles.msgDate}>
                        {new Date(r.created_at || r.creation_date || r.date).toLocaleDateString()}
                    </Text>
                </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      {!isResolved && (
          <View style={styles.inputArea}>
             <TouchableOpacity style={styles.cameraBtn} onPress={pickChatImage}>
                 <Ionicons name="camera" size={24} color={COLORS.primary} />
             </TouchableOpacity>
             {chatImage && (
                 <View style={{marginRight:5}}>
                     <Image source={{uri: chatImage.uri}} style={{width:40, height:40, borderRadius:5}} />
                     <TouchableOpacity style={{position:'absolute', top:-5, right:-5, backgroundColor:'red', borderRadius:10, width:15, height:15}} onPress={()=>setChatImage(null)}>
                         <Text style={{color:'white', fontSize:10}}>X</Text>
                     </TouchableOpacity>
                 </View>
             )}
             <TextInput style={styles.input} placeholder="Scrivi..." value={newComment} onChangeText={setNewComment} />
             <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="send" size={20} color="white" />}
             </TouchableOpacity>
          </View>
      )}

      {/* MODALE REPORT */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
          {/* ... (Codice modale report identico a prima) ... */}
           <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rapporto</Text>
                  <TextInput style={styles.modalInput} multiline value={interventionReport} onChangeText={setInterventionReport} />
                  <TouchableOpacity onPress={pickReportImage} style={styles.reportPhotoBtn}><Text>{reportImage ? 'Foto OK' : 'Allega Foto'}</Text></TouchableOpacity>
                  <View style={styles.modalButtons}>
                      <TouchableOpacity onPress={()=>setReportModalVisible(false)} style={[styles.modalBtn, {backgroundColor:'#ccc'}]}><Text>Annulla</Text></TouchableOpacity>
                      <TouchableOpacity onPress={handleSubmitReportAndClose} style={[styles.modalBtn, {backgroundColor: COLORS.primary}]}><Text style={{color:'white'}}>Chiudi Ticket</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* MODALE ASSEGNA */}
      <Modal visible={assignModalVisible} transparent animationType="fade">
          {/* ... (Codice modale assegna identico a prima) ... */}
           <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {maxHeight: '80%'}]}>
                  <Text style={styles.modalTitle}>Assegna</Text>
                  <FlatList data={operators} keyExtractor={item=>String(item.id)} renderItem={({item}) => (
                      <TouchableOpacity style={styles.operatorItem} onPress={()=>handleAssignOperator(item.id)}>
                          <Text style={styles.operatorName}>{item.name} {item.surname}</Text>
                      </TouchableOpacity>
                  )}/>
                  <TouchableOpacity onPress={()=>setAssignModalVisible(false)} style={{marginTop:10}}><Text>Chiudi</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* MODALE EDIT */}
      <Modal visible={editReplyModalVisible} transparent animationType="fade">
          {/* ... (Codice modale edit identico a prima) ... */}
           <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Modifica</Text>
                  <TextInput style={styles.modalInput} value={editReplyText} onChangeText={setEditReplyText} />
                  <View style={styles.modalButtons}>
                      <TouchableOpacity onPress={()=>setEditReplyModalVisible(false)} style={[styles.modalBtn, {backgroundColor:'#ccc'}]}><Text>Annulla</Text></TouchableOpacity>
                      <TouchableOpacity onPress={handleUpdateReply} style={[styles.modalBtn, {backgroundColor: COLORS.primary}]}><Text style={{color:'white'}}>Salva</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* --- MODALE IMMAGINE FULL SCREEN --- */}
      <Modal visible={fullScreenImage !== null} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
          <View style={{flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center'}}>
              <TouchableOpacity style={{position: 'absolute', top: 40, right: 20, zIndex: 10}} onPress={() => setFullScreenImage(null)}>
                  <Ionicons name="close-circle" size={40} color="white" />
              </TouchableOpacity>
              {fullScreenImage && (
                  <Image source={{ uri: fullScreenImage }} style={{width: '100%', height: '90%'}} resizeMode="contain" />
              )}
          </View>
      </Modal>

    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', elevation: 4 },
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
  metaInfo: { flexDirection: 'row', marginBottom: 20, paddingBottom:10, borderBottomWidth:1, borderColor:'#eee' },
  metaText: { fontSize: 12, color: '#888', marginRight: 15 },
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
  msgDate: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },
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
  ratingSub: { fontSize: 12, color: '#6B7280', marginTop: 5 },
  editContainer: { marginBottom: 15, backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  labelInput: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  editInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 10 },
  catSelectBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: '#E5E7EB', marginRight: 8 },
  catSelectBtnActive: { backgroundColor: COLORS.primary },
  catSelectText: { fontSize: 12, color: '#374151' },
  catSelectTextActive: { color: 'white' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { fontSize: 12, color: '#666', marginBottom: 15 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 15 },
  reportPhotoBtn: { alignItems:'center', justifyContent:'center', padding: 10, backgroundColor:'#F3F4F6', borderRadius: 8, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6 },
  modalBtnText: { fontWeight: 'bold' },
  operatorItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  operatorName: { marginLeft: 10, fontSize: 16 }
});