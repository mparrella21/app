import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// --- ASSIGNMENT (Assegnazione Ticket a Operatore) ---

// Recupera le assegnazioni
export const getAssignments = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            // Gestione robusta: se torna { success: true, assignments: [] } o direttamente l'array
            return data.assignments || (Array.isArray(data) ? data : []);
        }
        return [];
    } catch (e) {
        console.error('interventionService.getAssignments', e);
        return [];
    }
};

// Crea una nuova assegnazione (Responsabile -> Operatore)
export const createAssignment = async (ticketId, userId, note = "") => {
    try {
        const payload = {
            id_ticket: ticketId,
            id_user: userId,
            note: note // Passiamo anche la nota se il backend la supporta
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

// Aggiorna lo stato di un'assegnazione (es. Presa in carico)
// QUESTA MANCAVA: L'ho reinserita
export const updateAssignmentStatus = async (assignmentId, status) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        return response.ok; // o data.success
    } catch (e) {
        console.error('interventionService.updateAssignmentStatus', e);
        return false;
    }
};

// Elimina assegnazione
export const deleteAssignment = async (assignmentId) => {
    try {
        // Nota: verifica se l'ID passato è l'ID dell'assegnazione o del ticket. 
        // Solitamente è l'ID assegnazione per la DELETE specifica.
        const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) {
        console.error('interventionService.deleteAssignment', e);
        return false;
    }
};

// --- RATING (Valutazione Intervento) ---

export const getRating = async (ticketId) => {
    try {
        // API: GET /api/intervention/rating/{ticketId}
        const response = await authenticatedFetch(`${API_BASE}/intervention/rating/${ticketId}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            // L'API potrebbe tornare un array o un oggetto
            if (Array.isArray(data) && data.length > 0) return data[0];
            return data;
        }
        return null;
    } catch (e) {
        // 404 significa spesso "nessun rating ancora presente", non è un errore critico
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

// --- OPERATOR CATEGORIES & MAPPINGS ---

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