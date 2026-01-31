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

    // NOTA: Se il backend supporta il filtro server-side (es: /ticket?userId=XYZ), 
    // scommentare la chiamata fetch specifica per efficienza.
    /*
    const response = await fetch(`${API_BASE}/ticket?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(response.ok) {
        const data = await response.json();
        return data.tickets || [];
    }
    */

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
    // Questo è il flusso corretto secondo l'architettura (Assignment Service è la fonte di verità)
    try {
        const assignResponse = await fetch(`${API_BASE}/assignment`, {
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
        
        // Criterio B (Fallback): Il ticket ha il campo operatore stampato dentro (backend legacy/semplificato)
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

export const postTicket = async (ticketData, photos = []) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    // 1. Crea il Ticket
    const response = await fetch(`${API_BASE}/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ticketData)
    });

    const data = await response.json();
    const newTicketId = data.ticketId || (data.ticket && data.ticket.id);
    
    // 2. Se successo, carica le foto sul Media Service
    if ((data.success || response.status === 201) && newTicketId && photos.length > 0) {
       await uploadTicketMedia(newTicketId, photos, token);
    }

    return data.success === true || response.status === 201;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};

const uploadTicketMedia = async (ticketId, photos, token) => {
    try {
        const formData = new FormData();
        photos.forEach((photo, index) => {
            // Estrazione nome file o generazione nome univoco
            const fileName = photo.fileName || `ticket_${ticketId}_img_${index}.jpg`;
            
            formData.append('files', {
                uri: photo.uri,
                type: 'image/jpeg', 
                name: fileName
            });
        });
        
        // Chiamata al Media Service (come da architettura)
        await fetch(`${API_BASE}/media/${ticketId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
            body: formData
        });
    } catch (error) {
        console.error("Errore upload media:", error);
    }
}

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
        id_status: statusId // Opzionale, dipende dal backend
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

    // Alcuni backend usano PUT /ticket/{id} con status CLOSED, altri endpoint dedicato
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
    // Fallback: prova updateStatus standard se endpoint dedicato fallisce
    return await updateTicketStatus(idTicket, 'CLOSED', 3);
  }
};