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
            assignedTicketIds = assignments.filter(a => a.id_user === operatorId).map(a => a.id_ticket);
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni", assignError);
    }
    const allTickets = await getAllTickets();
    const myTasks = allTickets.filter(t => {
        const isInAssignments = assignedTicketIds.includes(t.id);
        const isActive = (t.id_status !== 3); 
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
    
    const finalPayload = {
        title: ticketData.title || ticketData.descrizione,
        id_status: 1, 
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: ticketData.categories || [], 
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

// *** MODIFICATO QUI ***
export const postReply = async (idTicket, replyData, files = []) => {
  try {
    // 1. Recuperiamo l'utente corrente per avere l'ID
    const userStr = await AsyncStorage.getItem('app_user');
    const userObj = userStr ? JSON.parse(userStr) : {};

    if (!userObj.id) {
        console.error("Errore postReply: User ID non trovato in storage");
        return false;
    }

    // 2. Costruiamo il payload come richiesto: body, type, user
    const payload = {
        body: replyData.body || replyData.text, // testo del messaggio
        type: replyData.type || 'USER',         // 'USER' (default) o 'REPORT'
        user: userObj.id                        // UUID dell'utente
    };

    console.log("Invio Reply Payload:", payload); // Debug

    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error("Errore risposta API Reply:", response.status);
    }

    return response.ok;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

// --- UPDATE & MANAGEMENT ---

export const updateTicketDetails = async (idTicket, details) => {
    try {
        const currentTicket = await getTicket(idTicket);
        if (!currentTicket) return false;

        const updatedBody = {
            ...currentTicket, 
            title: details.title || currentTicket.title,
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
        title: currentTicket.title,
        categories: currentTicket.categories ? currentTicket.categories.map(c => c.id) : [],
        lat: currentTicket.lat,
        lon: currentTicket.lon,
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
  return await updateTicketStatus(idTicket, 'CLOSED', 3); 
};