import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authService';
import { Platform } from 'react-native';

const extractCategoryIds = (categories) => {
    if (!Array.isArray(categories)) return [];
    return categories.map(c => (typeof c === 'object' && c.id ? c.id : c));
};

export const getAllTickets = async (tenantId) => {
  try {
    if (!tenantId) return [];
    const response = await authenticatedFetch(`${API_BASE}/ticket?tenant_id=${tenantId}`, { method: 'GET' });
    const data = await response.json();
    if (response.ok) return Array.isArray(data) ? data : (data.tickets || []);
    return [];
  } catch (e) { return []; }
};

export const getUserTickets = async (userId, tenantId) => {
  try {
    const allTickets = await getAllTickets(tenantId);
    return allTickets.filter(t => 
        t.user_id === userId || 
        t.creator_id === userId || 
        t.id_creator_user === userId
    );
  } catch (e) { return []; }
};

export const getOperatorTickets = async (operatorId, tenantId) => {
  try {
    if (!operatorId || !tenantId) return [];
    let assignedTicketIds = [];
    const assignResponse = await authenticatedFetch(`${API_BASE}/intervention/assignment?tenant_id=${tenantId}`, { method: 'GET' });
    if (assignResponse.ok) {
        const assignData = await assignResponse.json();
        const assignments = assignData.assignments || assignData || [];
        assignedTicketIds = assignments.filter(a => a.id_user === operatorId).map(a => a.id_ticket);
    }
    const allTickets = await getAllTickets(tenantId);
    return allTickets.filter(t => assignedTicketIds.includes(t.id) && t.id_status !== 3 && t.id_status !== 4); 
  } catch (e) { return []; }
};

export const getTicket = async (id, tenantId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/${id}?tenant_id=${tenantId}`, { method: 'GET' });
    const data = await response.json();
    return response.ok ? (data.ticket || data) : null;
  } catch (e) { return null; }
};

export const postTicket = async (ticketData, tenantId) => {
  try {
    const categoryIds = extractCategoryIds(ticketData.categories);
    const safeCategoryIds = categoryIds.map(id => String(id));

    const finalPayload = {
        tenant_id: tenantId,
        title: ticketData.title,
        id_status: 1, 
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: safeCategoryIds
    };
    
    console.log("Tentativo invio ticket:", JSON.stringify(finalPayload)); 

    const response = await authenticatedFetch(`${API_BASE}/ticket`, {
      method: 'POST',
      body: JSON.stringify(finalPayload)
    });
    
    if(response.ok) {
        const data = await response.json();
        return data.ticket || data || true; 
    } else {
        const errorText = await response.text();
        console.error("ERRORE SERVER POST TICKET:", response.status, errorText);
        return null;
    }
  } catch (e) { 
      console.error("ECCEZIONE POST TICKET:", e);
      return null; 
  }
};

// Funzione generica di update (PUT) per i dettagli (titolo, lat, lon, categories)
// Endpoint: /ticket/:id
export const updateTicket = async (id, tenantId, userId, updateData) => {
  try {
    const payload = { 
        tenant_id: tenantId, 
        user_id: userId, 
        ...updateData 
    };
    
    console.log("PAYLOAD UPDATE TICKET:", JSON.stringify(payload));

    const response = await authenticatedFetch(`${API_BASE}/ticket/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const err = await response.text();
        console.error("Errore UPDATE TICKET API:", err);
    }
    return response.ok;
  } catch (e) { 
      console.error("Eccezione updateTicket:", e);
      return false; 
  }
};

// Aggiorna solo i dettagli (Titolo, Categorie, Posizione) recuperando prima i dati esistenti
// Mantiene la logica di NON inviare id_status qui
export const updateTicketDetails = async (idTicket, tenantId, userId, details) => {
    const currentTicket = await getTicket(idTicket, tenantId);
    if (!currentTicket) return false;

    const lat = parseFloat(currentTicket.lat);
    const lon = parseFloat(currentTicket.lon);
    
    const safeCategories = details.categories 
    ? extractCategoryIds(details.categories)
    : extractCategoryIds(currentTicket.categories);

    return await updateTicket(idTicket, tenantId, userId, {
        title: details.title || currentTicket.title,
        categories: safeCategories,
        lat: isNaN(lat) ? 0 : lat,
        lon: isNaN(lon) ? 0 : lon,
        // Nota: id_status rimosso da qui come richiesto per evitare conflitti
    });
};

// NUOVA LOGICA AGGIORNAMENTO STATO
// Endpoint: /ticket/:id/status
// Payload richiesto: user_id, tenant_id, id_status
export const updateTicketStatus = async (idTicket, tenantId, userId, statusId) => {
    try {
        const payload = {
            tenant_id: tenantId,
            user_id: userId,
            id_status: parseInt(statusId)
        };

        console.log(`Aggiornamento Stato Ticket ${idTicket} a ${statusId} con User ${userId}`);

        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/status`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Errore UPDATE STATUS API:", err);
        }
        return response.ok;
    } catch (e) {
        console.error("Errore updateTicketStatus:", e);
        return false;
    }
};
export const closeTicket = async (idTicket, tenantId) => {
  return await updateTicketStatus(idTicket, tenantId, 3); 
};

export const deleteTicket = async (ticketId, tenantId) => {
    try {
        const payload = { tenant_id: tenantId };
        const response = await authenticatedFetch(`${API_BASE}/ticket/${ticketId}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const getAllReplies = async (idTicket, tenantId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply?tenant_id=${tenantId}`, { method: 'GET' });
    const data = await response.json();
    return response.ok ? (data.replies || data || []) : [];
  } catch (e) { return []; }
};


export const postReply = async (idTicket, tenantId, userId, bodyText, images = []) => {
  try {
    console.log(`Invio Reply. Immagini: ${images?.length || 0}. Testo: ${bodyText}`);

    const formData = new FormData();
    
    formData.append('tenant_id', tenantId);
    formData.append('user_id', userId);
    formData.append('body', bodyText || ""); 

    if (images && images.length > 0) {
        images.forEach((img, index) => {
            let uri = img.uri;
            if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
                uri = 'file://' + uri;
            }
            const timestamp = new Date().getTime();
            const filename = `upload_${timestamp}_${index}.jpg`; 
            const type = 'image/jpeg'; 
            
            console.log(`Allegando: ${filename}`);
            formData.append('file', { 
                uri: uri, 
                name: filename, 
                type: type 
            });
        });
    }

    let token = await AsyncStorage.getItem('app_access_token');

    let response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
        body: formData
    });

    if (response.status === 401) {
         console.log("Token scaduto, tento refresh...");
         await authenticatedFetch(`${API_BASE}/user/${userId}`, { method: 'GET' });
         token = await AsyncStorage.getItem('app_access_token');
         
         response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
            body: formData
        });
    }

    if (!response.ok) {
        const err = await response.text();
        console.error("Errore postReply:", response.status, err);
        return false;
    }
    
    return true;

  } catch (e) { 
      console.error("ECCEZIONE postReply:", e);
      return false; 
  }
};

export const updateReply = async (idTicket, idReply, tenantId, newBodyText) => {
    try {
        const payload = { tenant_id: tenantId, body: newBodyText };
        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply/${idReply}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteReply = async (idTicket, idReply, tenantId, userId) => {
    try {
        const payload = { tenant_id: tenantId, user_id: userId };
        const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply/${idReply}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const getCategories = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/categories`, { method: 'GET' });
    const textData = await response.text();
    const safeJsonText = textData.replace(/"id":\s*(\d+)/g, '"id": "$1"');
    const data = JSON.parse(safeJsonText);
    return response.ok ? data : [];
  } catch (e) { return []; }
};

export const createCategory = async (label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/ticket/categories`, {
            method: 'POST',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) { return false; }
};

export const updateCategory = async (id, label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/ticket/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteCategory = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/ticket/categories/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) { return false; }
};