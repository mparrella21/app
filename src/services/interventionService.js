import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// =====================================================================
// --- ASSIGNMENTS (Assegnazione Ticket a Operatore) ---
// =====================================================================

export const getAssignments = async (tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};

export const getAssignmentByTicketId = async (ticketId, tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${ticketId}?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return null;
    } catch (e) { return null; }
};

export const createAssignment = async (ticketId, userId, tenantId) => {
    try {
        // MODIFICA: id_user -> user_id
        const payload = { user_id: userId, tenant_id: tenantId, ticket_id: ticketId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteAssignment = async (ticketId, userId, tenantId) => {
    try {
        // MODIFICA: id_user -> user_id
        const payload = { user_id: userId, tenant_id: tenantId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${ticketId}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

// =====================================================================
// --- RATING (Valutazione Intervento) ---
// =====================================================================

export const getRating = async (ticketId, tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${ticketId}?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return null;
    } catch (e) { return null; }
};

export const sendFeedback = async (ticketId, tenantId, vote, replyId) => {
    try {
        const payload = { tenant_id: tenantId, rating: vote, id_ticket_reply: replyId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

// =====================================================================
// --- OPERATOR CATEGORIES (Gestione Categorie) ---
// =====================================================================

export const getOperatorCategories = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};

export const createOperatorCategory = async (label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories`, {
            method: 'POST',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) { return false; }
};

export const updateOperatorCategory = async (id, newLabel) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label: newLabel })
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteOperatorCategory = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) { return false; }
};

// =====================================================================
// --- MAPPINGS (Associazioni Operatori e Ticket) ---
// =====================================================================

export const getOperatorMappings = async (tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};

export const assignOperatorCategory = async (userId, tenantId, categoryId) => {
    try {
        // MODIFICA: id_user -> user_id
        const payload = { tenant_id: tenantId, user_id: userId, id_operator_category: categoryId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const removeOperatorCategory = async (userId, tenantId, categoryId) => {
    try {
        // MODIFICA: id_user -> user_id
        const payload = { tenant_id: tenantId, user_id: userId, id_operator_category: categoryId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const getOperatorTicketMappings = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/operator-ticket`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};