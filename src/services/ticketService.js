import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authService';

export const getAllTickets = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket`, { method: 'GET' });
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    if (data.success && Array.isArray(data.tickets)) return data.tickets;
    if (Array.isArray(data)) return data; 
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

export const getUserTickets = async (userId) => {
  try {
    const allTickets = await getAllTickets();
    const myTickets = allTickets.filter(t => 
        t.user === userId || 
        t.id_creator_user === userId || 
        t.user_id === userId
    );
    return myTickets; 
  } catch (e) {
    console.error('ticketService.getUserTickets', e);
    return [];
  }
};

export const getOperatorTickets = async (operatorId) => {
  try {
    if (!operatorId) return [];
    let assignedTicketIds = [];
    
    try {
        const assignResponse = await authenticatedFetch(`${API_BASE}/intervention/assignment`, { method: 'GET' });
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            const assignments = assignData.assignments || assignData || [];
            assignedTicketIds = assignments
                .filter(a => a.id_user === operatorId) // id_user come da txt
                .map(a => a.id_ticket); // id_ticket come da txt
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni", assignError);
    }

    const allTickets = await getAllTickets();
    const myTasks = allTickets.filter(t => {
        const isInAssignments = assignedTicketIds.includes(t.id);
        const isActive = (t.id_status !== 3); // Assumendo 3 = Chiuso/Risolto
        return isInAssignments && isActive;
    });

    return myTasks; 
  } catch (e) {
    console.error('ticketService.getOperatorTickets', e);
    return [];
  }
};

export const getTicket = async (id) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/${id}`, { method: 'GET' });
    const data = await response.json();
    if (response.ok) return data.ticket || data; // Gestisce formati diversi
    return null; 
  } catch (e) {
    console.error('ticketService.getTicket', e);
    throw e;
  }
};

export const getCategories = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/categories`, { method: 'GET' });
    const data = await response.json();
    if (response.ok) return data.categories || data || [];
    return []; 
  } catch (e) {
    console.error('ticketService.getCategories', e);
    return [];
  }
};

export const postTicket = async (ticketData, photos = []) => {
  try {
    // Recupera utente corrente per inserirlo nel payload (Richiesto dal txt)
    const userStr = await AsyncStorage.getItem('app_user');
    const userObj = userStr ? JSON.parse(userStr) : {};
    
    // Costruisci il payload esatto richiesto dal TXT
    // Esempio TXT: { "title": "...", "id_status": 1, "lat": ..., "lon": ..., "categories": [1], "user": "uuid" }
    const finalPayload = {
        title: ticketData.title || ticketData.descrizione, // Mappa i campi della UI
        id_status: 1, // 1 = Ricevuto/Nuovo
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: ticketData.categories || [], // Array di ID categorie
        user: userObj.id // Fondamentale
    };

    const response = await authenticatedFetch(`${API_BASE}/ticket`, {
      method: 'POST',
      body: JSON.stringify(finalPayload)
    });

    return response.ok;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};

// --- REPLIES & STATUS ---

export const getAllReplies = async (idTicket) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply`, { method: 'GET' });
    const data = await response.json();
    if (response.ok) return data.replies || data || [];
    return [];
  } catch (e) {
    console.error('ticketService.getAllReplies', e);
    return [];
  }
};

export const postReply = async (idTicket, replyData, files = []) => {
  try {
    // Qui andrebbe gestito il FormData se il backend lo supportasse per i file
    // Per ora mandiamo JSON come da txt
    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData)
    });

    return response.ok;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

// --- UPDATE & MANAGEMENT ---

export const updateTicketStatus = async (idTicket, statusStr, statusId) => {
  try {
    // 1. Il TXT mostra che la PUT richiede l'oggetto COMPLETO.
    // Quindi prima scarichiamo il ticket attuale.
    const currentTicket = await getTicket(idTicket);
    if (!currentTicket) return false;

    // 2. Aggiorniamo solo lo status e manteniamo il resto
    const updatedBody = {
        title: currentTicket.title,
        categories: currentTicket.categories ? currentTicket.categories.map(c => c.id) : [],
        lat: currentTicket.lat,
        lon: currentTicket.lon,
        id_status: statusId // Aggiorniamo lo status ID (es. 2 = In lavorazione)
    };

    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}`, {
      method: 'PUT',
      body: JSON.stringify(updatedBody)
    });

    return response.ok;
  } catch (e) {
    console.error('ticketService.updateTicketStatus', e);
    return false;
  }
};

export const assignTicket = async (ticketId, operatorId) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, {
        method: 'POST',
        body: JSON.stringify({
          id_ticket: ticketId, // Corretto key name
          id_user: operatorId  // Corretto key name
        })
      });
      return response.ok;
    } catch (e) {
      console.error('ticketService.assignTicket', e);
      return false;
    }
};

export const deleteTicket = async (ticketId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/ticket/${ticketId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) {
        console.error('ticketService.deleteTicket', e);
        return false;
    }
};

export const closeTicket = async (idTicket) => {
  return await updateTicketStatus(idTicket, 'CLOSED', 3); // 3 = Risolto
};