import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TICKET SERVICE (Core Domain: Ticket Lifecycle) ---

/**
 * Recupera tutti i ticket dal sistema.
 */
export const getAllTickets = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const url = `${API_BASE}/ticket`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined 
      }
    });

    if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
    const data = await response.json();
    
    // Gestione formati di risposta multipli (array diretto o oggetto { tickets: [...] })
    if (data.success && Array.isArray(data.tickets)) return data.tickets;
    if (Array.isArray(data)) return data; 
    
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

/**
 * Recupera SOLO i ticket creati dall'utente loggato.
 */
export const getUserTickets = async (userId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!userId) return [];

    // Fallback: Recupera tutti e filtra lato client (OK per volumi bassi)
    const allTickets = await getAllTickets();

    const myTickets = allTickets.filter(t => 
        t.id_creator_user === userId || 
        t.user_id === userId || 
        t.userId === userId
    );

    return myTickets; 
  } catch (e) {
    console.error('ticketService.getUserTickets', e);
    return [];
  }
};

/**
 * Recupera i ticket assegnati a un operatore specifico.
 * AGGIORNATO: Rispetta l'architettura a microservizi recuperando prima le assegnazioni.
 */
export const getOperatorTickets = async (operatorId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!operatorId) return [];

    let assignedTicketIds = [];
    
    // 1. Tenta di recuperare le assegnazioni dall'Assignment/Intervention Service
    try {
        // CORRETTO: Aggiornato endpoint per puntare a /intervention/assignment come da Doc Architettura
        const assignResponse = await fetch(`${API_BASE}/intervention/assignment`, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'Authorization': token ? `Bearer ${token}` : undefined 
            }
        });
        
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            const assignments = assignData.assignments || assignData || [];
            
            // Filtra assegnazioni per questo operatore e estrae gli ID dei ticket
            assignedTicketIds = assignments
                .filter(a => a.operatorId === operatorId || a.operator_id === operatorId)
                .map(a => a.ticketId || a.ticket_id);
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni dal service dedicato, uso fallback ticket.", assignError);
    }

    // 2. Recupera i ticket
    const allTickets = await getAllTickets();

    // 3. Filtra i ticket
    const myTasks = allTickets.filter(t => {
        // Criterio A: Il ticket è nella lista delle assegnazioni recuperate
        const isInAssignments = assignedTicketIds.includes(t.id);
        
        // Criterio B (Fallback): Il ticket ha il campo operatore stampato dentro
        const isDirectlyAssigned = (t.operator_id === operatorId || t.assigned_to === operatorId);
        
        // Criterio C: Il ticket deve essere attivo
        const isActive = (t.status !== 'CLOSED' && t.status !== 'Risolto' && t.status !== 'CHIUSO'); 
        
        return (isInAssignments || isDirectlyAssigned) && isActive;
    });

    return myTasks; 
  } catch (e) {
    console.error('ticketService.getOperatorTickets', e);
    return [];
  }
};

export const getTicket = async (id) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/ticket/${id}`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.ticket;
    return null; 
  } catch (e) {
    console.error('ticketService.getTicket', e);
    throw e;
  }
};

export const getCategories = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/ticket/categories`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.categories || [];
    return []; 
  } catch (e) {
    console.error('ticketService.getCategories', e);
    return [];
  }
};

/**
 * Crea un nuovo ticket.
 * MODIFICATO: Invia ticket e foto in un'unica chiamata multipart/form-data.
 */
export const postTicket = async (ticketData, photos = []) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const formData = new FormData();

    // Aggiungi i campi testuali
    Object.keys(ticketData).forEach(key => {
        if (ticketData[key] !== null && ticketData[key] !== undefined) {
            formData.append(key, String(ticketData[key]));
        }
    });

    // Aggiungi le foto
    photos.forEach((photo, index) => {
        const fileName = photo.fileName || `ticket_img_${index}.jpg`;
        formData.append('files', {
            uri: photo.uri,
            type: 'image/jpeg', 
            name: fileName
        });
    });

    // Unica chiamata POST verso il Backend
    const response = await fetch(`${API_BASE}/ticket`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        // NON impostare 'Content-Type': 'multipart/form-data', lo fa fetch automaticamente
      },
      body: formData
    });

    const data = await response.json();
    return data.success === true || response.status === 201;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};

// --- REPLIES & STATUS ---

export const getAllReplies = async (idTicket) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'GET',
      headers: { 
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.replies || [];
    return [];
  } catch (e) {
    console.error('ticketService.getAllReplies', e);
    return [];
  }
};

export const postReply = async (idTicket, replyData) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(replyData)
    });
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

export const updateTicketStatus = async (idTicket, statusStr, statusId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket/${idTicket}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: statusStr,
        id_status: statusId 
      })
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.updateTicketStatus', e);
    return false;
  }
};

export const closeTicket = async (idTicket) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket/${idTicket}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.closeTicket', e);
    return await updateTicketStatus(idTicket, 'CLOSED', 3);
  }
};