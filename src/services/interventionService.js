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
        const payload = { user_id: userId, tenant_id: tenantId, id_ticket: ticketId };
        console.log("INVIO ASSEGNAZIONE:", JSON.stringify(payload)); 

        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Se la risposta non è OK, leggiamo il messaggio di errore dal server
        if (!response.ok) {
            const errorText = await response.text();
            console.error("ERRORE SERVER ASSEGNAZIONE:", response.status, errorText);
            return false;
        }

        return true;
    } catch (e) { 
        console.error("ECCEZIONE NETWORK/CODICE:", e);
        return false; 
    }
};

export const deleteAssignment = async (ticketId, userId, tenantId) => {
    try {
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

export const getRatingsForReply = async (replyId, tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${replyId}?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            // L'API restituisce un array di oggetti { id_user, rating } o { user_id, rating }
            // Assicuriamoci che sia un array
            return Array.isArray(data) ? data : (data.ratings || []);
        }
        return [];
    } catch (e) { 
        console.error("Errore recupero ratings:", e);
        return []; 
    }
};

export const getRating = async (ticketId, tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${ticketId}?tenant_id=${tenantId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return null;
    } catch (e) { return null; }
};

export const sendFeedback = async (id_user, tenantId, vote, replyId) => {
    try {
        const payload = { tenant_id: tenantId, rating: vote, id_user: id_user, id_ticket_reply: replyId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteFeedback = async (ticketId, userId, tenantId) => {
    try {
        // API: DELETE /api/intervention/rating/id
        const payload = { user_id: userId, tenant_id: tenantId };
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${ticketId}`, {
            method: 'DELETE',
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