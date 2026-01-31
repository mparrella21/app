import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TICKET SERVICE (Lettura e Creazione) ---

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
    
    // Gestione robusta della risposta (array diretto o oggetto wrapper)
    if (data.success && Array.isArray(data.tickets)) return data.tickets;
    if (Array.isArray(data)) return data; 
    
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

// Recupera SOLO i ticket dell'utente loggato
export const getUserTickets = async (userId) => {
  try {
    // 1. Recuperiamo tutti i ticket (se il backend non ha endpoint dedicato /ticket/me)
    const allTickets = await getAllTickets();
    
    if (!userId) return [];

    // 2. Filtriamo lato client per garantire che si vedano solo i propri
    // Nota: 'id_creator_user' è il campo standard usato nel backend/sito.
    // Controlliamo anche 'user_id' o 'userId' per robustezza.
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

// Recupero Categorie (Dinamico)
export const getCategories = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    // Endpoint basato sull'architettura (Ticket Service gestisce metadati)
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

// Creazione Ticket con gestione Media
export const postTicket = async (ticketData, photos = []) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    // 1. Creazione del Ticket
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
    
    // 2. Se creato, caricamento Media (se presenti)
    // Supportiamo sia 'ticketId' che 'id' nella risposta
    const newTicketId = data.ticketId || (data.ticket && data.ticket.id);
    
    if (data.success && newTicketId && photos.length > 0) {
       await uploadTicketMedia(newTicketId, photos, token);
    }

    return data.success === true;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};

// Funzione helper per il Media Service
const uploadTicketMedia = async (ticketId, photos, token) => {
    try {
        const formData = new FormData();
        photos.forEach((photo, index) => {
            // Estrazione nome file o generazione
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

// --- REPLIES & ACTIONS ---

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

// Aggiornamento Stato Generico (Per Operatori)
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

// Chiusura Ticket
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

// --- FEEDBACK / RATING ---
export const sendFeedback = async (idTicket, rating, comment = "") => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
          ticketId: idTicket,
          vote: rating, 
          comment: comment 
      })
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.sendFeedback', e);
    return false;
  }
};