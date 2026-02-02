import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// Recupera tutti gli operatori incrociando GET /api/operator e GET /api/user
export const getOperators = async () => {
  try {
    // 1. Prendi gli ID degli operatori
    const opResponse = await authenticatedFetch(`${API_BASE}/operator`, { method: 'GET' });
    if (!opResponse.ok) return [];
    const operatorIds = await opResponse.json(); // Array di UUID ["id1", "id2"]

    if (!Array.isArray(operatorIds) || operatorIds.length === 0) return [];

    // 2. Prendi TUTTI gli utenti
    const usersResponse = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
    if (!usersResponse.ok) return [];
    const allUsers = await usersResponse.json(); 

    // 3. Filtra solo quelli che sono nella lista operatori
    const operators = allUsers.filter(u => operatorIds.includes(u.id));
    return operators;
  } catch (e) {
    console.error('userService.getOperators', e);
    return [];
  }
};

// Alias per compatibilità con il codice esistente
export const getOperatorsByTenant = getOperators;

export const createOperator = async (operatorData) => {
  try {
    // PASSO 1: Creare l'utente base (POST /api/user)
    const userPayload = {
        name: operatorData.name,
        surname: operatorData.surname,
        birth_date: operatorData.birth_date || "2000-01-01", // Default se manca
        phonenumber: operatorData.phonenumber || operatorData.phoneNumber
    };

    const createResp = await authenticatedFetch(`${API_BASE}/user`, {
      method: 'POST',
      body: JSON.stringify(userPayload)
    });

    if (!createResp.ok) {
        console.error("Errore creazione utente base per operatore");
        return false;
    }

    // Per ottenere l'ID del nuovo utente, dobbiamo cercarlo nella lista utenti
    // (poiché la POST /api/user spesso non restituisce l'ID creato nel body in alcune implementazioni, 
    // ma se lo fa, usiamo quello).
    let newUserId = null;
    const createdData = await createResp.json();
    
    if (createdData && createdData.id) {
        newUserId = createdData.id;
    } else {
        // Fallback: Cerchiamo l'utente appena creato tramite GET ALL
        const usersResp = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
        const users = await usersResp.json();
        // Cerchiamo per numero di telefono (univoco si spera) o nome/cognome
        const found = users.find(u => 
            u.phonenumber === userPayload.phonenumber && 
            u.surname === userPayload.surname
        );
        if (found) newUserId = found.id;
    }

    if (!newUserId) {
        console.error("Impossibile recuperare ID nuovo utente");
        return false;
    }

    // PASSO 2: Promuovere a Operatore (POST SET OPERATOR)
    // Endpoint: http://192.168.72.107:32413/api/operator
    // Body: { "id": "uuid" }
    const setOpResp = await authenticatedFetch(`${API_BASE}/operator`, {
        method: 'POST',
        body: JSON.stringify({ id: newUserId })
    });

    return setOpResp.ok;

  } catch (e) {
    console.error('userService.createOperator', e);
    return false;
  }
};

export const updateOperator = async (id, operatorData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(operatorData)
    });
    return response.ok;
  } catch (e) {
    console.error('userService.updateOperator', e);
    return false;
  }
};

export const deleteUser = async (id) => {
  try {
    // Se è un operatore, dovremmo prima fare UNSET OPERATOR (DEL /api/operator/{id})
    // Poi eliminare l'utente. Proviamo a fare entrambi.
    
    // 1. Tenta rimozione ruolo operatore (non bloccante se fallisce/non esiste)
    await authenticatedFetch(`${API_BASE}/operator/${id}`, { method: 'DELETE' });

    // 2. Elimina utente fisico
    const response = await authenticatedFetch(`${API_BASE}/user/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (e) {
    console.error('userService.deleteUser', e);
    return false;
  }
};

export const updateUserProfile = async (id, userData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    return { success: response.ok, message: data.message };
  } catch (e) {
    console.error('userService.updateUserProfile', e);
    return { success: false, message: 'Errore di connessione' };
  }
};