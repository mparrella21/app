import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authService';

export const getAllTickets = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket`, { method: 'GET' });
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    // Gestione della risposta che potrebbe essere un array diretto o un oggetto { tickets: [...] }
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
    // Filtro lato client basato sull'ID utente
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
        // Recupera le assegnazioni da /api/intervention/assignment
        const assignResponse = await authenticatedFetch(`${API_BASE}/intervention/assignment`, { method: 'GET' });
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            const assignments = assignData.assignments || assignData || [];
            
            // Filtra le assegnazioni per l'operatore corrente
            assignedTicketIds = assignments
                .filter(a => a.id_user === operatorId)
                .map(a => a.id_ticket);
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni", assignError);
    }

    const allTickets = await getAllTickets();
    
    // Filtra i ticket: devono essere assegnati e NON chiusi (id_status != 3)
    const myTasks = allTickets.filter(t => {
        const isInAssignments = assignedTicketIds.includes(t.id);
        const isActive = (t.id_status !== 3); // 3 = Risolto/Chiuso
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
    // Recupera utente corrente
    const userStr = await AsyncStorage.getItem('app_user');
    const userObj = userStr ? JSON.parse(userStr) : {};
    
    // Costruzione payload secondo specifiche api.txt
    const finalPayload = {
        title: ticketData.title || ticketData.descrizione,
        id_status: 1, // 1 = Ricevuto/Nuovo
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: ticketData.categories || [], // Array di interi (es: [1, 3])
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
    // API TXT: La reply si aspetta un corpo ("body").
    // replyData arriva dalla UI come { text: "...", author: "..." } o simile.
    
    const payload = {
        body: replyData.text || replyData.body, // Mappa text in body
        date: new Date().toISOString(),
        // Alcuni backend potrebbero volere l'id_creator_user o l'id_ticket nel body,
        // ma solitamente l'id_ticket è nell'URL.
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

// --- UPDATE & MANAGEMENT ---

export const updateTicketDetails = async (idTicket, details) => {
    try {
        // Recupera prima il ticket attuale per non sovrascrivere altri campi
        const currentTicket = await getTicket(idTicket);
        if (!currentTicket) return false;

        const updatedBody = {
            ...currentTicket, // Mantiene lat, lon, status, user
            title: details.title || currentTicket.title,
            // Il campo descrizione nel backend potrebbe non esistere separatamente o essere parte del titolo/body
            // Se esiste un campo 'description' lo aggiorniamo, altrimenti usiamo titolo.
            // In base al TXT il POST usa 'title', quindi lavoriamo su quello.
        };

        // Se l'API supporta description separata, aggiungila qui.
        // Esempio: updatedBody.description = details.description;

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
    // PUT EDIT TICKET richiede tutto l'oggetto
    const currentTicket = await getTicket(idTicket);
    if (!currentTicket) return false;

    const updatedBody = {
        title: currentTicket.title,
        categories: currentTicket.categories ? currentTicket.categories.map(c => c.id) : [],
        lat: currentTicket.lat,
        lon: currentTicket.lon,
        id_status: statusId // Aggiorniamo ID status (es. 2 = In lavorazione, 3 = Risolto)
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
      // POST NEW ASSIGNMENT
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
  return await updateTicketStatus(idTicket, 'CLOSED', 3); // 3 = Risolto
};