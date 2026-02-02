import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authService';

// Helper per estrarre solo gli ID dalle categorie
const extractCategoryIds = (categories) => {
    if (!Array.isArray(categories)) return [];
    return categories.map(c => (typeof c === 'object' && c.id ? c.id : c));
};

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
            assignedTicketIds = assignments.filter(a => a.id_user === operatorId).map(a => a.id_ticket);
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni", assignError);
    }
    const allTickets = await getAllTickets();
    const myTasks = allTickets.filter(t => {
        const isInAssignments = assignedTicketIds.includes(t.id);
        const isActive = (t.id_status !== 3 && t.id_status !== 4); // Escludi Risolto (3) e Chiuso (4) se necessario
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
    if (response.ok) return data.ticket || data; 
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
    const userStr = await AsyncStorage.getItem('app_user');
    const userObj = userStr ? JSON.parse(userStr) : {};
    
    // Assicuriamoci che le categorie siano un array di interi [1, 2, 3]
    const categoryIds = extractCategoryIds(ticketData.categories);

    const finalPayload = {
        title: ticketData.title || ticketData.descrizione,
        id_status: 1, 
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: categoryIds, 
        user: userObj.id 
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

// --- REPLIES & MESSAGES ---

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
    const userStr = await AsyncStorage.getItem('app_user');
    const userObj = userStr ? JSON.parse(userStr) : {};

    if (!userObj.id) {
        console.error("Errore postReply: User ID non trovato in storage");
        return false;
    }

    const payload = {
        body: replyData.body || replyData.text,
        type: replyData.type || 'USER',
        user: userObj.id
    };

    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

export const updateReply = async (idTicket, idReply, newBodyText) => {
    try {
        const payload = {
            body: newBodyText
        };
        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply/${idReply}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('ticketService.updateReply', e);
        return false;
    }
};

export const deleteReply = async (idTicket, idReply, currentBodyText = "") => {
    try {
        const payload = {
            body: currentBodyText // Le API richiedono il body anche in cancellazione
        };
        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply/${idReply}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('ticketService.deleteReply', e);
        return false;
    }
};

// --- UPDATE & MANAGEMENT ---

export const updateTicketDetails = async (idTicket, details) => {
    try {
        const currentTicket = await getTicket(idTicket);
        if (!currentTicket) return false;

        // Prepariamo il payload per la PUT, assicurandoci che categories sia un array di ID
        const updatedBody = {
            title: details.title || currentTicket.title || currentTicket.titolo,
            categories: details.categories ? extractCategoryIds(details.categories) : extractCategoryIds(currentTicket.categories),
            lat: parseFloat(currentTicket.lat),
            lon: parseFloat(currentTicket.lon),
            id_status: currentTicket.id_status
        };

        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}`, {
            method: 'PUT',
            body: JSON.stringify(updatedBody)
        });
        return response.ok;
    } catch (e) {
        console.error('ticketService.updateTicketDetails', e);
        return false;
    }
};

export const updateTicketStatus = async (idTicket, statusStr, statusId) => {
  try {
    const currentTicket = await getTicket(idTicket);
    if (!currentTicket) return false;

    const updatedBody = {
        title: currentTicket.title || currentTicket.titolo,
        categories: extractCategoryIds(currentTicket.categories),
        lat: parseFloat(currentTicket.lat),
        lon: parseFloat(currentTicket.lon),
        id_status: statusId 
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
          id_ticket: ticketId,
          id_user: operatorId 
        })
      });
      return response.ok;
    } catch (e) {
      console.error('ticketService.assignTicket', e);
      return false;
    }
};

// *** MODIFICATO: Ora accetta l'oggetto ticket intero per inviare il body richiesto dalle API ***
export const deleteTicket = async (ticket) => {
    try {
        const payload = {
            title: ticket.title || ticket.titolo,
            categories: extractCategoryIds(ticket.categories),
            lat: parseFloat(ticket.lat),
            lon: parseFloat(ticket.lon),
            id_status: ticket.id_status
        };

        const response = await authenticatedFetch(`${API_BASE}/ticket/${ticket.id}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('ticketService.deleteTicket', e);
        return false;
    }
};

export const closeTicket = async (idTicket) => {
  return await updateTicketStatus(idTicket, 'CLOSED', 3); // Modificato da 4 a 3 (Risolto) secondo le convenzioni comuni del progetto
};