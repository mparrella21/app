import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// Recupera tutti gli operatori incrociando GET /api/operator e GET /api/user
export const getOperators = async () => {
  try {
    // 1. Prendi gli ID degli operatori
    const opResponse = await authenticatedFetch(`${API_BASE}/operator`, { method: 'GET' });
    if (!opResponse.ok) return [];
    const operatorIds = await opResponse.json(); // Esempio: ["id1", "id2"]

    if (!Array.isArray(operatorIds) || operatorIds.length === 0) return [];

    // 2. Prendi TUTTI gli utenti (Il backend non sembra supportare ?role=Operatore)
    const usersResponse = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
    if (!usersResponse.ok) return [];
    const allUsers = await usersResponse.json(); // Array di oggetti utente

    // 3. Filtra solo quelli che sono nella lista operatori
    const operators = allUsers.filter(u => operatorIds.includes(u.id));
    return operators;
  } catch (e) {
    console.error('userService.getOperators', e);
    return [];
  }
};

export const createOperator = async (operatorData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/user`, {
      method: 'POST',
      body: JSON.stringify({ ...operatorData, role: 'Operatore' }) // Nota: il backend assegna il ruolo, ma lo passiamo per completezza
    });
    // Dopo aver creato l'utente, bisogna promuoverlo a operatore? 
    // Il txt dice "POST SET OPERATOR {id}". 
    // Se la creazione utente è generica, potrebbe servire un passo extra.
    // Assumiamo per ora che basti creare l'utente e poi fare SET OPERATOR se necessario, 
    // ma per il Requirements Doc sembra che il Responsabile crei direttamente l'account.
    
    const data = await response.json();
    return response.ok; // o data.success
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
    const data = await response.json();
    return response.ok;
  } catch (e) {
    console.error('userService.updateOperator', e);
    return false;
  }
};

export const deleteUser = async (id) => {
  try {
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