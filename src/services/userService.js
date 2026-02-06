import { API_BASE } from './config';
import { authenticatedFetch } from './authService';
import { getOperatorCategories, getOperatorMappings, assignOperatorCategory } from './interventionService';


export const promoteToManager = async (userId, tenantId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant_id: tenantId,
                user_id: userId
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Errore promozione manager:", errText);
            return { success: false, error: "Impossibile promuovere." };
        }
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.message };
    }
};

export const getManagersByTenant = async (tenantId) => {
    try {
        // 1. Recupera la lista delle relazioni manager (coppie id, tenant_id)
        const response = await authenticatedFetch(`${API_BASE}/manager?tenant_id=${tenantId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        let managerRelations = [];
        if (response.ok) {
            const data = await response.json();
            managerRelations = Array.isArray(data) ? data : (data.managers || []);
        } else {
            return [];
        }

        // 2. Per ogni manager, recuperiamo i dettagli anagrafici
        // Nota: l'API /manager ritorna oggetti che hanno 'id' (che è l'id utente) o 'user_id'
        const managersPromises = managerRelations.map(async (rel) => {
            const targetId = rel.id_user || rel.user_id || rel.id; 
            if (!targetId) return null;

            // Recuperiamo i dati anagrafici completi
            const userDetails = await getUserById(targetId);
            if (!userDetails) return null;

            return { 
                ...userDetails, 
                id: targetId, // ID utente
                manager_record_id: rel.id // Se serve l'ID della relazione, altrimenti l'ID utente basta per il deleteManager standard
            };
        });

        const managers = (await Promise.all(managersPromises)).filter(m => m !== null);
        return managers;

    } catch (e) {
        console.error("Errore getManagersByTenant", e);
        return [];
    }
};
// Recupera tutti gli utenti
export const getAllUsers = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};

export const getUserById = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user/${id}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data[0] : data;
        }
        return null;
    } catch (e) { return null; }
};

export const updateProfile = async (userId, profileData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user/${userId}`, {
            method: 'PUT', 
            body: JSON.stringify(profileData)
        });
        return response.ok;
    } catch (e) { return false; }
};

// --- GESTIONE OPERATORI ---

// Rimuove il ruolo di operatore
export const deleteOperator = async (operatorId, tenantId) => {
  try {
    // API TXT: DELETE /api/operator/id => body: tenant_id
    const response = await authenticatedFetch(`${API_BASE}/operator/${operatorId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
    });
    return response.ok;
  } catch (e) { 
      console.error("Errore deleteUser", e);
      return false; 
  }
};

export const deleteManager = async (managerId, tenantId) => {
  try {
    // API TXT: DELETE /api/manager/id => body: tenant_id
    const response = await authenticatedFetch(`${API_BASE}/manager/${managerId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
    });
    return response.ok;
  } catch (e) { 
      console.error("Errore deleteManager", e);
      return false; 
  }
};

export const deleteUser = async (userId) => {
    try {
        // API: DELETE /api/user/id
        const response = await authenticatedFetch(`${API_BASE}/user/${userId}`, { 
            method: 'DELETE'
        });
        return response.ok;
    } catch (e) { 
        console.error("Errore deleteUser", e);
        return false; 
    }
};

export const promoteToOperator = async (userId, tenantId, categoryId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Errore promozione operatore:", errText);
        return { success: false, error: "Impossibile promuovere. Verifica l'ID utente." };
    }

    if (categoryId) {
        await assignOperatorCategory(userId, tenantId, categoryId);
    }

    return { success: true };
  } catch (e) { 
      console.error(e);
      return { success: false, error: e.message }; 
  }
};

export const getOperatorsByTenant = async (tenantId) => {
    try {
        // 1. Recupera la lista operatori (relazione)
        // API TXT: GET /api/operator => body (query param): tenant_id
        const response = await authenticatedFetch(`${API_BASE}/operator?tenant_id=${tenantId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        let operatorRelations = [];
        if (response.ok) {
            const data = await response.json();
            // L'API potrebbe ritornare { operators: [...] } o direttamente [...]
            operatorRelations = Array.isArray(data) ? data : (data.operators || []);
        } else {
            return [];
        }

        // Recuperiamo categorie e mapping per arricchire i dati
        const categories = await getOperatorCategories();
        const mappings = await getOperatorMappings(tenantId);

        // 2. Per ogni relazione, recuperiamo i dettagli anagrafici dell'utente
        const operatorsPromises = operatorRelations.map(async (rel) => {
            // L'API /operator ritorna coppie {id (user_id), tenant_id} o simili
            const targetId = rel.id_user || rel.user_id || rel.id; 
            if (!targetId) return null;

            const userDetails = await getUserById(targetId);
            if (!userDetails) return null;

            // Arricchiamo con la categoria (se presente nei mapping)
            const userMap = mappings.find(m => String(m.id_user) === String(targetId));
            let catLabel = 'Non assegnato';
            let catId = null;

            if (userMap) {
                const cat = categories.find(c => String(c.id) === String(userMap.id_operator_category));
                if (cat) {
                    catLabel = cat.label;
                    catId = cat.id;
                }
            }

            return { 
                ...userDetails, 
                id: targetId, // Assicuriamoci che l'ID sia quello dell'utente
                category: catLabel, 
                category_id: catId 
            };
        });

        const operators = (await Promise.all(operatorsPromises)).filter(op => op !== null);
        return operators;

    } catch (e) {
        console.error("Errore getOperatorsByTenant", e);
        return [];
    }
};