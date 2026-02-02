import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

// --- INTERVENTION SERVICE ---

export const getAssignments = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, { method: 'GET' });
    const data = await response.json();
    if (response.ok) {
        const list = Array.isArray(data) ? data : (data.assignments || []);
        return list; 
    }
    return [];
  } catch (e) {
    console.error('interventionService.getAssignments', e);
    return [];
  }
};

export const createAssignment = async (ticketId, operatorId, note = "") => {
  try {
    const payload = {
      id_ticket: ticketId,
      id_user: operatorId,
    };

    const response = await authenticatedFetch(`${API_BASE}/intervention/assignment`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (e) {
    console.error('interventionService.createAssignment', e);
    return false;
  }
};

export const updateAssignmentStatus = async (assignmentId, status) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      return response.ok;
    } catch (e) {
      console.error('interventionService.updateAssignmentStatus', e);
      return false;
    }
};

export const deleteAssignment = async (assignmentId) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/intervention/assignment/${assignmentId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (e) {
      console.error('interventionService.deleteAssignment', e);
      return false;
    }
};

export const getOperatorCategories = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/intervention/operator-categories`, { method: 'GET' });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) return data;
        return [];
    } catch (e) {
        console.error('interventionService.getOperatorCategories', e);
        return [];
    }
};

export const sendFeedback = async (ticketId, rating, comment = "") => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/intervention/rating`, {
      method: 'POST',
      body: JSON.stringify({ 
          id_ticket: ticketId, // Chiave corretta per coerenza con assignment
          vote: rating, 
          comment: comment 
      })
    });
    return response.ok;
  } catch (e) {
    console.error('interventionService.sendFeedback', e);
    return false;
  }
};