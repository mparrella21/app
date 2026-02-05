import { API_BASE } from './config';
import { authenticatedFetch } from './authService';
import { getOperatorCategories, getOperatorMappings, assignOperatorCategory } from './interventionService';

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
            method: 'POST', 
            body: JSON.stringify(profileData)
        });
        return response.ok;
    } catch (e) { return false; }
};

// --- GESTIONE OPERATORI ---

// Rimuove il ruolo di operatore
export const deleteUser = async (operatorId, tenantId) => {
  try {
    // CORREZIONE: Anche per la DELETE, se il backend accetta query params, è più sicuro.
    // Tuttavia, le DELETE spesso accettano il body. Se ti da errore anche qui, cambialo in query param.
    // Per ora mantengo il body come da specifiche TXT, ma se fallisce usa: ?tenant_id=${tenantId}
    const response = await authenticatedFetch(`${API_BASE}/operator/${operatorId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
    });
    return response.ok;
  } catch (e) { return false; }
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

// 1. Prendi la lista delle relazioni operatore (ID e TenantID)

const response = await authenticatedFetch(`${API_BASE}/operator?tenant_id=${tenantId}`, {

method: 'GET',

headers: { 'Content-Type': 'application/json' }

});



let operatorRelations = [];

if (response.ok) {

operatorRelations = await response.json();

// Assicuriamoci sia un array

if (!Array.isArray(operatorRelations)) operatorRelations = [];

} else {

console.warn("API /operator fallita o vuota");

// Fallback vuoto o su mapping se necessario, ma meglio evitare errori

}



const categories = await getOperatorCategories();

const mappings = await getOperatorMappings(tenantId);



// 2. Per ogni relazione, recuperiamo i dettagli anagrafici dell'utente

// usando GET /api/user/{id} che è permesso.

const operatorsPromises = operatorRelations.map(async (rel) => {

// L'API operator potrebbe restituire { id: ..., user_id: ..., ... } oppure direttamente l'oggetto user.

// Assumiamo restituisca una relazione con user_id o id che è l'id operatore.

// Dal txt: "Restituisce la coppia {id, tid}". 'id' qui è presumibilmente l'user_id dell'operatore.

const targetId = rel.user_id || rel.id;


if (!targetId) return null;



const userDetails = await getUserById(targetId);

if (!userDetails) return null;



// Arricchiamo con la categoria

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



return { ...userDetails, id: targetId, category: catLabel, category_id: catId };

});



// Risolviamo tutte le promesse e filtriamo i null

const operators = (await Promise.all(operatorsPromises)).filter(op => op !== null);



return operators;

} catch (e) {

console.error("Errore getOperatorsByTenant", e);

return [];

}

};