import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput, TouchableOpacity, Alert, Image, ScrollView, Modal } from 'react-native';
import { getTicket, getAllReplies, postReply } from '../services/ticketService';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../styles/global';
import { OFFLINE_MODE } from '../services/config';
import { getById as getMockById, addReply as addMockReply, closeTicket, assignTicket, updateTicket } from '../services/mockTicketStore';
import { getAllUsers } from '../services/mockUserStore';
import { useAuth } from '../context/AuthContext';

export default function TicketDetailScreen({ route }) {
  const { id } = route.params || {};
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [sending, setSending] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [operators, setOperators] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (OFFLINE_MODE) {
          const t = await getMockById(id);
          setTicket(t);
          setReplies(t?.replies || []);
        } else {
          const t = await getTicket(id);
          setTicket(t);
          const r = await getAllReplies(id);
          setReplies(r);
        }
      } catch (e) {
        Alert.alert('Errore', 'Impossibile caricare il ticket');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const pickReplyImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve il permesso per accedere alle immagini'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.6 });
      if (!res.canceled && res.assets && res.assets.length) setReplyImages(prev => [...prev, res.assets[0].uri]);
    } catch (e) { console.warn('pickReplyImage', e); }
  };

  const handleSend = async () => {
    if (!replyText.trim() && (!replyImages || replyImages.length === 0)) return;
    setSending(true);
    if (OFFLINE_MODE) {
      const ok = await addMockReply(id, { text: replyText, author: user?.name || 'Utente', images: replyImages });
      setSending(false);
      if (ok) {
        Alert.alert('Inviato', 'Risposta inviata (locale)');
        setReplyText('');
        setReplyImages([]);
        const t = await getMockById(id);
        setReplies(t?.replies || []);
      } else {
        Alert.alert('Errore', 'Impossibile inviare la risposta locale');
      }
      return;
    }

    const ok = await postReply(id, { text: replyText });
    setSending(false);
    if (ok) {
      Alert.alert('Inviato', 'Risposta inviata');
      setReplyText('');
      const r = await getAllReplies(id);
      setReplies(r);
    } else {
      Alert.alert('Errore', 'Impossibile inviare la risposta');
    }
  };

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large"/></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ticket?.title}</Text>
      <Text style={styles.sub}>Da: {ticket?.user || 'Utente'} • Stato: {ticket?.status || 'open'}</Text>

      {ticket?.images && ticket.images.length > 0 && (
        <ScrollView horizontal style={{marginVertical:8}} showsHorizontalScrollIndicator={false}>
          {ticket.images.map((u,i)=> (
            <Image key={i} source={{ uri: u }} style={{ width: 180, height: 120, borderRadius: 8, marginRight: 8 }} />
          ))}
        </ScrollView>
      )}

      <Text style={styles.section}>Descrizione</Text>
      <Text style={styles.sub}>{ticket?.info || ticket?.description}</Text>

      <Text style={styles.section}>Conversazione</Text>
      <FlatList data={replies} keyExtractor={(i)=>String(i.id)} renderItem={({item})=> (
        <View style={styles.replyCard}>
          <Text style={{fontWeight:'700'}}>{item.user_name || item.author || 'Utente'}</Text>
          <Text style={{marginTop:6}}>{item.text}</Text>
          {item.images && item.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
              {item.images.map((u,i)=>(<Image key={i} source={{uri:u}} style={{width:120,height:80,borderRadius:6,marginRight:8}} />))}
            </ScrollView>
          )}
        </View>
      )} ListEmptyComponent={<Text>Nessuna risposta</Text>} />

      <View style={styles.replyBox}>
        <TextInput style={styles.input} placeholder="Scrivi una risposta..." value={replyText} onChangeText={setReplyText} multiline />
      </View>

      <View style={{flexDirection:'row',alignItems:'center',marginTop:8}}>
        <TouchableOpacity style={styles.photoBtn} onPress={pickReplyImage}><Text style={{color:'#fff'}}>Aggiungi foto</Text></TouchableOpacity>
        <ScrollView horizontal style={{marginLeft:10}} showsHorizontalScrollIndicator={false}>
          {replyImages.map((u,i)=> (
            <TouchableOpacity key={i} onPress={()=>{setReplyImages(prev=>prev.filter(x=>x!==u))}}>
              <Image source={{uri:u}} style={{width:64,height:64,borderRadius:8,marginRight:8}} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{flex:1,alignItems:'flex-end'}}>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}><Text style={{color:'#fff'}}>{sending? '...' : 'Invia'}</Text></TouchableOpacity>
        </View>
      </View>

      {ticket?.status !== 'closed' && (
        <TouchableOpacity style={{marginTop:12,backgroundColor:'#777',padding:10,borderRadius:8,alignItems:'center'}} onPress={async ()=>{
          if (OFFLINE_MODE) {
            const ok = await closeTicket(ticket.id);
            if (ok) {
              const t = await getMockById(ticket.id);
              setTicket(t);
              Alert.alert('Chiuso','Segnalazione chiusa');
            } else {
              Alert.alert('Errore','Impossibile chiudere (locale)');
            }
          } else {
            Alert.alert('Funzionalità server','Chiudi ticket richiede API attive');
          }
        }}>
          <Text style={{color:'#fff'}}>Chiudi segnalazione</Text>
        </TouchableOpacity>
      )}

      {/* Role-specific actions */}
      { (user?.role||'').toLowerCase() === 'operatore' && ticket?.status !== 'closed' && (
        <View style={{marginTop:12}}>
          <TouchableOpacity style={{backgroundColor:COLORS.primary,padding:10,borderRadius:8,alignItems:'center',marginBottom:8}} onPress={async ()=>{
            // assign to self
            if (OFFLINE_MODE) {
              const ok = await assignTicket(ticket.id, user.name || 'Operatore');
              if (ok) {
                const t = await getMockById(ticket.id);
                setTicket(t);
                Alert.alert('Assegnato','Ticket assegnato a te');
              }
            } else Alert.alert('Funzionalità server','Assegnazione richiede API');
          }}>
            <Text style={{color:'#fff'}}>Prendi in carico</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:10,borderRadius:8,alignItems:'center'}} onPress={async ()=>{
            if (OFFLINE_MODE) {
              const ok = await updateTicket(ticket.id, { status: 'closed' });
              if (ok) { const t = await getMockById(ticket.id); setTicket(t); Alert.alert('Risolto','Ticket segnato come risolto'); }
            } else Alert.alert('Funzionalità server','Risoluzione richiede API');
          }}>
            <Text style={{color:'#fff'}}>Segna risolto</Text>
          </TouchableOpacity>
        </View>
      )}

      { (user?.role||'').toLowerCase() === 'responsabile' && ticket?.status !== 'closed' && (
        <View style={{marginTop:12}}>
          <TouchableOpacity style={{backgroundColor:COLORS.primary,padding:10,borderRadius:8,alignItems:'center'}} onPress={async ()=>{
            // open list of operators
            const allUsers = await getAllUsers();
            setOperators(allUsers.filter(u=> (u.role||'').toLowerCase()==='operatore'));
            setAssignModal(true);
          }}>
            <Text style={{color:'#fff'}}>Assegna operatore</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={assignModal} animationType="slide" transparent>
        <TouchableOpacity style={{flex:1}} onPress={()=>setAssignModal(false)} />
        <View style={{position:'absolute',bottom:0,left:0,right:0,maxHeight:360,backgroundColor:'#fff',padding:12,borderTopLeftRadius:12,borderTopRightRadius:12}}>
          <Text style={{fontWeight:'800',marginBottom:12}}>Seleziona operatore</Text>
          <ScrollView>
            {operators.map(o => (
              <TouchableOpacity key={o.id} style={{padding:12,borderBottomWidth:1,borderBottomColor:'#eee'}} onPress={async ()=>{
                if (OFFLINE_MODE) {
                  const ok = await assignTicket(ticket.id, o.name);
                  if (ok) { const t = await getMockById(ticket.id); setTicket(t); setAssignModal(false); Alert.alert('Assegnato',`Assegnato a ${o.name}`); }
                } else Alert.alert('Funzionalità server','Assegnazione richiede API');
              }}>
                <Text>{o.name}</Text>
                <Text style={{color:'#666'}}>{o.email}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor: COLORS.bg },
  title: { fontSize:20, fontWeight:'800', color: COLORS.primary },
  sub: { color: '#444', marginVertical:8 },
  section: { marginTop:12, fontWeight:'700' },
  replyCard: { padding:10, backgroundColor:'#fff', borderRadius:8, marginVertical:6 },
  replyBox: { marginTop:12, flexDirection:'row', gap:8, alignItems:'center' },
  input: { flex:1, backgroundColor:COLORS.light, padding:10, borderRadius:8 },
  photoBtn: { backgroundColor:COLORS.primary, padding:10, borderRadius:8 },
  sendBtn: { marginLeft:8, backgroundColor:COLORS.primary, padding:10, borderRadius:8 }
});