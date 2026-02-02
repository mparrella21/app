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

    if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
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

export const getOperatorTickets = async (operatorId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!operatorId) return [];

    let assignedTicketIds = [];
    
    // 1. Tenta di recuperare le assegnazioni dall'Intervention Service
    try {
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
            assignedTicketIds = assignments
                .filter(a => a.operatorId === operatorId || a.operator_id === operatorId)
                .map(a => a.ticketId || a.ticket_id);
        }
    } catch (assignError) {
        console.warn("Impossibile recuperare assegnazioni, uso fallback ticket.", assignError);
    }

    // 2. Recupera i ticket e filtra
    const allTickets = await getAllTickets();
    const myTasks = allTickets.filter(t => {
        const isInAssignments = assignedTicketIds.includes(t.id);
        const isDirectlyAssigned = (t.operator_id === operatorId || t.assigned_to === operatorId);
        // Filtra via i ticket chiusi se necessario, o mostrali come storico
        // Qui mostriamo solo quelli attivi per "Le mie attività"
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

    const formData = new FormData();
    Object.keys(ticketData).forEach(key => {
        if (ticketData[key] !== null && ticketData[key] !== undefined) {
            formData.append(key, String(ticketData[key]));
        }
    });

    photos.forEach((photo, index) => {
        const fileName = photo.fileName || `ticket_img_${index}.jpg`;
        formData.append('files', {
            uri: photo.uri,
            type: 'image/jpeg', 
            name: fileName
        });
    });

    const response = await fetch(`${API_BASE}/ticket`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
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

export const postReply = async (idTicket, replyData, files = []) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    let body;
    let headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (files && files.length > 0) {
        const formData = new FormData();
        
        Object.keys(replyData).forEach(key => {
            formData.append(key, String(replyData[key]));
        });

        files.forEach((file, index) => {
             const fileName = file.fileName || `reply_img_${index}.jpg`;
             formData.append('files', {
                 uri: file.uri,
                 type: 'image/jpeg',
                 name: fileName
             });
        });

        body = formData;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(replyData);
    }

    const response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      headers: headers,
      body: body
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

// --- UPDATE & MANAGEMENT ---

export const updateTicketStatus = async (idTicket, statusStr, statusId) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    // PUT /ticket/{id} come da Architettura Pag 15 (Ticket Service)
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

// Assegnazione Ticket (Intervention Service)
export const assignTicket = async (ticketId, operatorId) => {
    try {
      const token = await AsyncStorage.getItem('app_auth_token');
      const response = await fetch(`${API_BASE}/intervention/assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          operator_id: operatorId
        })
      });
      const data = await response.json();
      return data.success === true;
    } catch (e) {
      console.error('ticketService.assignTicket', e);
      return false;
    }
};

// [NUOVO] Per Responsabili (IF-3.3): Eliminazione Ticket
export const deleteTicket = async (ticketId) => {
    try {
        const token = await AsyncStorage.getItem('app_auth_token');
        const response = await fetch(`${API_BASE}/ticket/${ticketId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        return data.success === true;
    } catch (e) {
        console.error('ticketService.deleteTicket', e);
        return false;
    }
};

export const closeTicket = async (idTicket) => {
  // [FIX] Architettura non prevede endpoint /close. Usiamo updateTicketStatus.
  // Assumiamo che ID stato 3 = Chiuso/Risolto (come da esempio precedente)
  return await updateTicketStatus(idTicket, 'CLOSED', 3);
};