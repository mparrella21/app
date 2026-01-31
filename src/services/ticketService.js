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
    // Gestione robusta: supporta sia { tickets: [...] } che array diretto
    if (response.ok && data.success) return data.tickets || [];
    if (Array.isArray(data)) return data; 
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

// Recupera solo i ticket dell'utente loggato
export const getUserTickets = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    // Proviamo a passare userId come query param se il backend lo supporta, 
    // altrimenti filtrare lato client è il fallback sicuro.
    // Assumiamo che GET /ticket ritorni tutto e filtriamo per sicurezza o usiamo un endpoint specifico se esiste
    const allTickets = await getAllTickets();
    
    // NOTA: Qui idealmente il backend dovrebbe avere un endpoint /ticket/me o /ticket?user_id=...
    // Per ora, dato che non abbiamo l'ID utente qui nel service, ritorniamo tutto 
    // e lasciamo che la Screen filtri, oppure implementiamo una chiamata specifica se il backend la ha.
    return allTickets; 
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
    if (data.success && data.ticketId && photos.length > 0) {
       await uploadTicketMedia(data.ticketId, photos, token);
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
            formData.append('files', {
                uri: photo.uri,
                type: 'image/jpeg', 
                name: `ticket_${ticketId}_${index}.jpg`
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

// Aggiornamento Stato Generico (Per Operatori: Presa in carico, ecc.)
export const updateTicketStatus = async (idTicket, statusStr, statusId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    // Utilizziamo una PUT/PATCH generica sul ticket
    const response = await fetch(`${API_BASE}/ticket/${idTicket}`, {
      method: 'PUT', // o PATCH a seconda del backend, PUT è standard per replace
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: statusStr,
        id_status: statusId
        // Eventualmente aggiungere assignedTo: ... se gestito dal backend tramite token operatore
      })
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.updateTicketStatus', e);
    return false;
  }
};

// Chiusura Ticket (Scorciatoia specifica se esiste endpoint dedicato)
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