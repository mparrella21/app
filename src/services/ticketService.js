import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authService';

const extractCategoryIds = (categories) => {
    if (!Array.isArray(categories)) return [];
    return categories.map(c => (typeof c === 'object' && c.id ? c.id : c));
};

// =====================================================================
// --- GESTIONE TICKET ---
// =====================================================================

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
    return allTickets.filter(t => t.user_id === userId || t.creator_id === userId);
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
    const finalPayload = {
        tenant_id: tenantId,
        title: ticketData.title,
        id_status: 1, 
        lat: parseFloat(ticketData.lat),
        lon: parseFloat(ticketData.lon),
        categories: categoryIds
    };
    const response = await authenticatedFetch(`${API_BASE}/ticket`, {
      method: 'POST',
      body: JSON.stringify(finalPayload)
    });
    return response.ok;
  } catch (e) { return false; }
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

// RIPRISTINATO: Eliminazione Ticket (Per Admin)
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

// =====================================================================
// --- REPLIES (Messaggi) ---
// =====================================================================

export const getAllReplies = async (idTicket, tenantId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply?tenant_id=${tenantId}`, { method: 'GET' });
    const data = await response.json();
    return response.ok ? (data.replies || data || []) : [];
  } catch (e) { return []; }
};

export const postReply = async (idTicket, tenantId, userId, bodyText) => {
  try {
    const payload = { tenant_id: tenantId, user_id: userId, body: bodyText };
    const response = await authenticatedFetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (e) { return false; }
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

// =====================================================================
// --- CATEGORIES (Per Ticket) ---
// =====================================================================

export const getCategories = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/categories`, { method: 'GET' });
    const data = await response.json();
    return response.ok ? data : [];
  } catch (e) { return []; }
};

// RIPRISTINATO: Creazione Categoria Ticket (Per Admin)
export const createCategory = async (label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/categories`, {
            method: 'POST',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) { return false; }
};

// RIPRISTINATO: Modifica Categoria Ticket (Per Admin)
export const updateCategory = async (id, label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) { return false; }
};

// RIPRISTINATO: Elimina Categoria Ticket (Per Admin)
export const deleteCategory = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) { return false; }
};