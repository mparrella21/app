import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- INTERVENTION SERVICE ---
// Gestisce Assegnazioni, Rapporti di intervento e Feedback (Rating)
// Rif: Architecture Document, Pag 5 e Diagramma API Pag 12
// NOTA ARCHITETTURALE: Tutti gli endpoint di questo servizio devono essere prefissati con /intervention

// 1. ASSEGNAZIONI (Assignments)

// Recupera le assegnazioni per un operatore specifico (o per l'utente loggato se operatore)
export const getAssignments = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    // CORRETTO: Aggiunto prefisso /intervention come da Architecture Doc
    const response = await fetch(`${API_BASE}/intervention/assignment`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });

    const data = await response.json();
    if (response.ok && data.success) {
        // L'endpoint restituisce una lista di assegnazioni
        return data.assignments || [];
    }
    return [];
  } catch (e) {
    console.error('interventionService.getAssignments', e);
    return [];
  }
};

// Crea una nuova assegnazione (Usato dal Responsabile della Manutenzione)
// Rif: UC-14 Assegnare ticket agli operatori
export const createAssignment = async (ticketId, operatorId, note = "") => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const payload = {
      ticketId: ticketId,
      operatorId: operatorId,
      note: note,
      timestamp: new Date().toISOString()
    };

    // CORRETTO: Aggiunto prefisso /intervention
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
    console.error('interventionService.createAssignment', e);
    return false;
  }
};

// Aggiorna un'assegnazione (es. Operatore prende in carico)
export const updateAssignmentStatus = async (assignmentId, status) => {
    try {
      const token = await AsyncStorage.getItem('app_auth_token');
      // CORRETTO: Aggiunto prefisso /intervention
      const response = await fetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
  
      const data = await response.json();
      return data.success === true;
    } catch (e) {
      console.error('interventionService.updateAssignmentStatus', e);
      return false;
    }
};

// Elimina assegnazione (Opzionale, per correzioni Responsabile)
export const deleteAssignment = async (assignmentId) => {
    try {
      const token = await AsyncStorage.getItem('app_auth_token');
      // CORRETTO: Aggiunto prefisso /intervention
      const response = await fetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (e) {
      console.error('interventionService.deleteAssignment', e);
      return false;
    }
};

// 2. RATING / FEEDBACK
// Spostato qui da ticketService perché l'architettura lo posiziona sotto Intervention Service

export const sendFeedback = async (ticketId, rating, comment = "") => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    // Nota: L'endpoint è /intervention/rating come da architettura
    const response = await fetch(`${API_BASE}/intervention/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
          ticketId: ticketId,
          vote: rating, 
          comment: comment 
      })
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('interventionService.sendFeedback', e);
    return false;
  }
};