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

export const updateTicket = async (id, tenantId, updateData) => {
  try {
    const payload = { tenant_id: tenantId, ...updateData };
    const response = await authenticatedFetch(`${API_BASE}/ticket/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (e) { return false; }
};

export const updateTicketDetails = async (idTicket, tenantId, details) => {
    const currentTicket = await getTicket(idTicket, tenantId);
    if (!currentTicket) return false;
    return await updateTicket(idTicket, tenantId, {
        title: details.title || currentTicket.title,
        categories: details.categories ? extractCategoryIds(details.categories) : currentTicket.categories,
        lat: parseFloat(currentTicket.lat),
        lon: parseFloat(currentTicket.lon),
        id_status: currentTicket.id_status
    });
};

export const updateTicketStatus = async (idTicket, tenantId, statusId) => {
  return await updateTicket(idTicket, tenantId, { id_status: statusId });
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

// --- POST REPLY CORRETTA ---
// --- POST REPLY CORRETTA (Sempre FormData) ---
export const postReply = async (idTicket, tenantId, userId, bodyText, images = []) => {
  try {
    console.log(`Invio Reply. Immagini: ${images?.length || 0}. Testo: ${bodyText}`);

    // CREIAMO SEMPRE UN FORMDATA, ANCHE SE NON CI SONO IMMAGINI
    const formData = new FormData();
    
    formData.append('tenant_id', tenantId);
    formData.append('user_id', userId);
    formData.append('body', bodyText || ""); 

    // Se ci sono immagini, le appendiamo
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

    // Recuperiamo il token
    let token = await AsyncStorage.getItem('app_access_token');

    // USIAMO FETCH MANUALE PERCHÉ authenticatedFetch AGGIUNGE AUTOMATICAMENTE
    // 'Content-Type': 'application/json' CHE ROMPE IL FORMDATA
    let response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            // NESSUN Content-Type QUI! Il browser/engine metterà multipart/form-data; boundary=...
        },
        body: formData
    });

    // Gestione scadenza token (401)
    if (response.status === 401) {
         console.log("Token scaduto, tento refresh...");
         // Chiamata dummy per refreshare il token
         await authenticatedFetch(`${API_BASE}/user/${userId}`, { method: 'GET' });
         token = await AsyncStorage.getItem('app_access_token');
         
         // Riprova con nuovo token
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