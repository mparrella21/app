import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Recupera tutti gli utenti (filtrati lato backend per il tenant del responsabile)
export const getOperators = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/user?role=Operatore`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (response.ok && data.success) return data.users || [];
    return [];
  } catch (e) {
    console.error('userService.getOperators', e);
    return [];
  }
};

// Crea un nuovo operatore (Responsabile crea account operatore)
export const createOperator = async (operatorData) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...operatorData, role: 'Operatore' })
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('userService.createOperator', e);
    return false;
  }
};

// Aggiorna un operatore specifico (Lato Responsabile - UC-12)
export const updateOperator = async (id, operatorData) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/user/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(operatorData)
    });
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('userService.updateOperator', e);
    return false;
  }
};

// Elimina un operatore (Lato Responsabile)
export const deleteUser = async (id) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/user/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('userService.deleteUser', e);
    return false;
  }
};

// Aggiorna il profilo dell'utente loggato (Self-service)
export const updateUserProfile = async (id, userData) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/user/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    return { success: data.success === true, message: data.message };
  } catch (e) {
    console.error('userService.updateUserProfile', e);
    return { success: false, message: 'Errore di connessione' };
  }
};