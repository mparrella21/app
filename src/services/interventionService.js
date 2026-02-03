import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// =====================================================================
// --- CORE INTERVENTIONS (Ticket Base) ---
// =====================================================================

export const getInterventions = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('interventionService.getInterventions', e);
        return [];
    }
};

export const getUserInterventions = async (userId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions/user/${userId}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('interventionService.getUserInterventions', e);
        return [];
    }
};

export const getInterventionById = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions/${id}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return null;
    } catch (e) {
        console.error('interventionService.getInterventionById', e);
        return null;
    }
};

export const createIntervention = async (interventionData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions`, {
            method: 'POST',
            body: JSON.stringify(interventionData)
        });
        if (response.ok) return await response.json();
        return null;
    } catch (e) {
        console.error('interventionService.createIntervention', e);
        return null;
    }
};

export const updateInterventionStatus = async (id, newStatus) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.updateInterventionStatus', e);
        return false;
    }
};

export const closeIntervention = async (id, closingNotes) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions/${id}/close`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                closing_notes: closingNotes,
                status: 'Risolto'
            })
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.closeIntervention', e);
        return false;
    }
};

export const deleteIntervention = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/interventions/${id}`, { method: 'DELETE' });
        return response.ok;
    } catch (e) {
        console.error('interventionService.deleteIntervention', e);
        return false;
    }
};

// =====================================================================
// --- ASSIGNMENT (Assegnazione Ticket a Operatore) - CORRETTO PER IL TXT ---
// =====================================================================

export const getAssignments = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            return data.assignments || (Array.isArray(data) ? data : []);
        }
        return [];
    } catch (e) {
        console.error('interventionService.getAssignments', e);
        return [];
    }
};

// NUOVA AGGIUNTA CHE SERVE AL TICKET DETAIL SCREEN
export const getAssignmentByTicketId = async (ticketId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${ticketId}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            return data.length > 0 ? data[0] : null;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const createAssignment = async (ticketId, userId) => {
    try {
        const payload = {
            id_ticket: ticketId,
            id_user: userId
        };
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.createAssignment', e);
        return false;
    }
};

export const deleteAssignment = async (ticketId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${ticketId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.deleteAssignment', e);
        return false;
    }
};

// =====================================================================
// --- RATING (Valutazione Intervento) - CORRETTO ---
// =====================================================================

export const getRating = async (ticketId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${ticketId}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            // Il backend restituisce un oggetto singolo o array. Adattiamo.
            if (Array.isArray(data) && data.length > 0) return data[0];
            return data;
        }
        return null;
    } catch (e) {
        return null; 
    }
};

export const sendFeedback = async (ticketId, vote, comment = "") => {
    try {
        const payload = {
            id_ticket: ticketId,
            vote: vote,
            comment: comment 
        };
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.sendFeedback', e);
        return false;
    }
};

// =====================================================================
// --- OPERATOR CATEGORIES & MAPPINGS - ORIGINALE ---
// =====================================================================

export const getOperatorCategories = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('interventionService.getOperatorCategories', e);
        return [];
    }
};

export const createOperatorCategory = async (label) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories`, {
            method: 'POST',
            body: JSON.stringify({ label })
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.createOperatorCategory', e);
        return false;
    }
};

export const updateOperatorCategory = async (id, newLabel) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label: newLabel })
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.updateOperatorCategory', e);
        return false;
    }
};

export const deleteOperatorCategory = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.deleteOperatorCategory', e);
        return false;
    }
};

// MAPPATURA: UTENTE -> CATEGORIA OPERATORE (Specializzazione)
export const getOperatorMappings = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('interventionService.getOperatorMappings', e);
        return [];
    }
};

export const assignOperatorCategory = async (userId, tenantId, categoryId) => {
    try {
        const payload = {
            tenant_id: tenantId,
            id_user: userId,
            id_operator_category: categoryId
        };
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.assignOperatorCategory', e);
        return false;
    }
};

export const removeOperatorCategory = async (userId, tenantId, categoryId) => {
    try {
        const payload = {
            tenant_id: tenantId,
            id_user: userId,
            id_operator_category: categoryId
        };
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/user-operator`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.removeOperatorCategory', e);
        return false;
    }
};

// NUOVA: MAPPATURA CATEGORIA OPERATORE -> CATEGORIA TICKET
export const getOperatorTicketMappings = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/mappings/operator-ticket`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('interventionService.getOperatorTicketMappings', e);
        return [];
    }
};