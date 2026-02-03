import { API_BASE } from './config';
import { authenticatedFetch } from './authService';
import { getOperatorCategories, getOperatorMappings } from './interventionService';

// NUOVA FUNZIONE: Necessaria per recuperare tutti gli utenti
export const getAllUsers = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('userService.getAllUsers', e);
        return [];
    }
};

// Recupera tutti gli operatori e arricchisce i dati con la loro categoria
export const getOperators = async () => {
  try {
    const opResponse = await authenticatedFetch(`${API_BASE}/operator`, { method: 'GET' });
    if (!opResponse.ok) return [];
    const operatorIds = await opResponse.json(); 

    if (!Array.isArray(operatorIds) || operatorIds.length === 0) return [];

    const allUsers = await getAllUsers();

    let operators = allUsers.filter(u => operatorIds.includes(u.id));

    try {
        const [categories, mappings] = await Promise.all([
            getOperatorCategories(),
            getOperatorMappings()
        ]);

        if (Array.isArray(categories) && Array.isArray(mappings)) {
            operators = operators.map(op => {
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

export const createOperator = async (operatorData) => {
  try {
    const userPayload = {
        name: operatorData.name,
        surname: operatorData.surname,
        birth_date: operatorData.birth_date || "2000-01-01", 
        phonenumber: operatorData.phonenumber || operatorData.phoneNumber || "0000000000"
    };

    const createResp = await authenticatedFetch(`${API_BASE}/user`, {
      method: 'POST',
      body: JSON.stringify(userPayload)
    });

    if (!createResp.ok) return { success: false };

    let newUserId = null;
    const createdData = await createResp.json();
    
    if (createdData && createdData.id) {
        newUserId = createdData.id;
    } else {
        const users = await getAllUsers();
        const found = users.find(u => 
            u.phonenumber === userPayload.phonenumber && 
            u.surname === userPayload.surname
        );
        if (found) newUserId = found.id;
    }

    if (!newUserId) return { success: false };

    const setOpResp = await authenticatedFetch(`${API_BASE}/operator`, {
        method: 'POST',
        body: JSON.stringify({ id: newUserId })
    });

    // FIX: Ora restituisce un oggetto { success, id }
    return { success: setOpResp.ok, id: newUserId };

  } catch (e) {
    console.error('userService.createOperator', e);
    return { success: false };
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
    await authenticatedFetch(`${API_BASE}/operator/${id}`, { method: 'DELETE' });
    const response = await authenticatedFetch(`${API_BASE}/user/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (e) {
    console.error('userService.deleteUser', e);
    return false;
  }
};

export const updateProfile = async (userId, profileData) => {
    try {
        const payload = {
            name: profileData.name,
            surname: profileData.surname,
            phonenumber: profileData.phonenumber
        };
        const response = await authenticatedFetch(`${API_BASE}/user/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) {
        console.error('userService.updateProfile', e);
        return false;
    }
};

export const setOperator = async (userId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/operator`, {
            method: 'POST',
            body: JSON.stringify({ id: userId })
        });
        return response.ok;
    } catch (e) {
        console.error('userService.setOperator', e);
        return false;
    }
};

export const unsetOperator = async (userId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/operator/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ id: userId })
        });
        return response.ok;
    } catch (e) {
        console.error('userService.unsetOperator', e);
        return false;
    }
};

export const getOperatorsByTenant = async () => {
    try {
        const opResponse = await authenticatedFetch(`${API_BASE}/operator`, { method: 'GET' });
        if (!opResponse.ok) return [];
        const operatorIds = await opResponse.json();

        const allUsers = await getAllUsers();
        return allUsers.filter(user => operatorIds.includes(user.id));
    } catch (e) {
        console.error('userService.getOperatorsByTenant', e);
        return [];
    }
};

export const setManager = async (userId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/manager`, {
            method: 'POST',
            body: JSON.stringify({ id: userId })
        });
        return response.ok;
    } catch (e) {
        console.error('userService.setManager', e);
        return false;
    }
};

// NUOVA FUNZIONE: Rimuovere il manager
export const unsetManager = async (userId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/manager/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ id: userId })
        });
        return response.ok;
    } catch (e) {
        console.error('userService.unsetManager', e);
        return false;
    }
};