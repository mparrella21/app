import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Assegna un ticket a un operatore
// Rif: UC-14 Assegnare ticket agli operatori
// Corrisponde all'endpoint POST /assignment nel diagramma API
export const assignTicketToOperator = async (idTicket, idOperator) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const payload = {
      ticketId: idTicket,
      operatorId: idOperator,
      timestamp: new Date().toISOString()
    };

    // Nota: L'Architecture Doc indica /assignment sotto Intervention Service
    const response = await fetch(`${API_BASE}/intervention/assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('interventionService.assignTicketToOperator', e);
    return false;
  }
};

// Recupera gli interventi assegnati (per l'Operatore)
// Rif: UC-15 Prendere in carico un ticket assegnato
export const getMyInterventions = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    // Endpoint per recuperare i ticket assegnati all'operatore loggato
    const response = await fetch(`${API_BASE}/intervention/assignment/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.assignments || [];
    return [];
  } catch (e) {
    console.error('interventionService.getMyInterventions', e);
    return [];
  }
};