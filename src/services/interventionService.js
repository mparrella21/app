import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- INTERVENTION SERVICE ---
// Gestisce Assegnazioni, Rapporti di intervento e Feedback (Rating)

// 1. ASSEGNAZIONI (Assignments)

// Recupera le assegnazioni per un operatore specifico
export const getAssignments = async () => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const response = await fetch(`${API_BASE}/intervention/assignment`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });

    const data = await response.json();
    if (response.ok) {
        // La doc dice che ritorna un array diretto o dentro un oggetto
        // Normalizziamo la risposta
        const list = Array.isArray(data) ? data : (data.assignments || []);
        
        // Mappiamo i campi del backend (id_ticket, id_user) in quelli usati dall'app se necessario
        // Oppure lasciamo che l'app usi id_ticket/id_user.
        return list; 
    }
    return [];
  } catch (e) {
    console.error('interventionService.getAssignments', e);
    return [];
  }
};

// Crea una nuova assegnazione (Usato dal Responsabile della Manutenzione)
// Rif: UC-14 Assegnare ticket agli operatori
// DOC API: Richiede id_user (operatore) e id_ticket
export const createAssignment = async (ticketId, operatorId, note = "") => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const payload = {
      id_ticket: ticketId,    // Corretto da ticketId a id_ticket come da doc
      id_user: operatorId,    // Corretto da operatorId a id_user come da doc
      // note: note // La doc non mostra il campo note nel corpo esempio, ma lo lasciamo se il backend lo supporta opzionalmente
    };

    const response = await fetch(`${API_BASE}/intervention/assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Alcuni backend restituiscono 200 o 201
    return response.ok;
  } catch (e) {
    console.error('interventionService.createAssignment', e);
    return false;
  }
};

// Aggiorna un'assegnazione
export const updateAssignmentStatus = async (assignmentId, status) => {
    try {
      const token = await AsyncStorage.getItem('app_auth_token');
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
      return data.success === true || response.ok;
    } catch (e) {
      console.error('interventionService.updateAssignmentStatus', e);
      return false;
    }
};

export const deleteAssignment = async (assignmentId) => {
    try {
      const token = await AsyncStorage.getItem('app_auth_token');
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

// 2. CATEGORIE OPERATORI (Nuovo da Doc)

export const getOperatorCategories = async () => {
    try {
        const token = await AsyncStorage.getItem('app_auth_token');
        const response = await fetch(`${API_BASE}/intervention/operator-categories`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': token ? `Bearer ${token}` : undefined
            }
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) return data;
        return [];
    } catch (e) {
        console.error('interventionService.getOperatorCategories', e);
        return [];
    }
};

// 3. RATING / FEEDBACK

export const sendFeedback = async (ticketId, rating, comment = "") => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/intervention/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
          ticketId: ticketId, // Verifica se la doc richiede id_ticket o ticketId, nel dubbio standardizzo
          vote: rating, 
          comment: comment 
      })
    });

    const data = await response.json();
    return response.ok; // La doc non mostra sempre success:true esplicito
  } catch (e) {
    console.error('interventionService.sendFeedback', e);
    return false;
  }
};