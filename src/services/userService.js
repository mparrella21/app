import { API_BASE } from './config';
import { authenticatedFetch } from './authService';
import { getOperatorCategories, getOperatorMappings } from './interventionService';

// Recupera tutti gli operatori e arricchisce i dati con la loro categoria
export const getOperators = async () => {
  try {
    // 1. Prendi gli ID degli operatori (GET /api/operator)
    const opResponse = await authenticatedFetch(`${API_BASE}/operator`, { method: 'GET' });
    if (!opResponse.ok) return [];
    const operatorIds = await opResponse.json(); // Array di UUID

    if (!Array.isArray(operatorIds) || operatorIds.length === 0) return [];

    // 2. Prendi TUTTI gli utenti (GET /api/user)
    const usersResponse = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
    if (!usersResponse.ok) return [];
    const allUsers = await usersResponse.json(); 

    // 3. Filtra solo quelli che sono nella lista operatori
    let operators = allUsers.filter(u => operatorIds.includes(u.id));

    // 4. (NUOVO) Recupera Categorie e Mappature per arricchire l'oggetto operatore
    try {
        const [categories, mappings] = await Promise.all([
            getOperatorCategories(),
            getOperatorMappings()
        ]);

        if (Array.isArray(categories) && Array.isArray(mappings)) {
            operators = operators.map(op => {
                // Trova la mappatura per questo utente
                // Nota: L'API restituisce un array di oggetti {id_user, id_operator_category...}
                const userMap = mappings.find(m => m.id_user === op.id);
                if (userMap) {
                    const cat = categories.find(c => String(c.id) === String(userMap.id_operator_category));
                    if (cat) {
                        return { ...op, category: cat.label, category_id: cat.id };
                    }
                }
                return { ...op, category: 'Non assegnato' };
            });
        }
    } catch (enrichError) {
        console.warn("Impossibile arricchire dati operatori con categorie", enrichError);
    }

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
        birth_date: operatorData.birth_date || "2000-01-01", 
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

    // Recupero ID
    let newUserId = null;
    const createdData = await createResp.json();
    
    if (createdData && createdData.id) {
        newUserId = createdData.id;
    } else {
        // Fallback: Cerchiamo l'utente appena creato
        const usersResp = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
        const users = await usersResp.json();
        const found = users.find(u => 
            u.phonenumber === userPayload.phonenumber && 
            u.surname === userPayload.surname
        );
        if (found) newUserId = found.id;
    }

    if (!newUserId) return false;

    // PASSO 2: Promuovere a Operatore (POST SET OPERATOR)
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
    // 1. Tenta rimozione ruolo operatore
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