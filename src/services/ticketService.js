import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TICKET SERVICE (Core Domain: Ticket Lifecycle) ---

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

    if (!response.ok) throw new Error('HTTP error');
    const data = await response.json();
    
    if (data.success && Array.isArray(data.tickets)) return data.tickets;
    if (Array.isArray(data)) return data; 
    
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

// Recupera SOLO i ticket dell'utente loggato
// UPDATED: Tenta di usare endpoint filtrato lato server se disponibile, altrimenti fallback
export const getUserTickets = async (userId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    
    // Tentativo 1: Chiamata ottimizzata (Best Practice)
    // Se il backend supporta /ticket?userId=... o /ticket/me
    /* const response = await fetch(`${API_BASE}/ticket?userId=${userId}`, ...);
    if(response.ok) return (await response.json()).tickets;
    */

    // Fallback attuale (Client-side filtering - Meno performante ma funzionante con backend semplice)
    const allTickets = await getAllTickets();
    if (!userId) return [];

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

// Recupera i ticket assegnati a un operatore
// NOTA: Architetturalmente, questo dovrebbe passare per interventionService.getAssignments()
// Manteniamo questa funzione per compatibilità se il backend Ticket restituisce il campo operator_id
export const getOperatorTickets = async (operatorId) => {
  try {
    // Se usiamo l'approccio "Ticket Service sa tutto":
    const allTickets = await getAllTickets();
    
    if (!operatorId) return [];

    const myTasks = allTickets.filter(t => {
        // Controllo se il ticket è assegnato a questo operatore
        // Nota: Assicurarsi che il backend popoli questi campi nel JSON del ticket
        const isAssignedToMe = (t.operator_id === operatorId || t.assigned_to === operatorId);
        // Filtriamo stati non rilevanti (es. già chiusi da tempo)
        const isActive = (t.status !== 'CLOSED' && t.status !== 'Risolto'); 
        
        return isAssignedToMe && isActive;
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
    
    // Gestione caricamento foto su Media Service
    if (data.success && newTicketId && photos.length > 0) {
       await uploadTicketMedia(newTicketId, photos, token);
    }

    return data.success === true;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};

const uploadTicketMedia = async (ticketId, photos, token) => {
    try {
        const formData = new FormData();
        photos.forEach((photo, index) => {
            const fileName = photo.fileName || `ticket_${ticketId}_${index}.jpg`;
            formData.append('files', {
                uri: photo.uri,
                type: 'image/jpeg', 
                name: fileName
            });
        });
        
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

// --- REPLIES ---

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
    return false;
  }
};