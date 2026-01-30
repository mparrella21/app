import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAllTickets = async () => {
  try {
    const url = `${API_BASE}/ticket`;
    console.info('ticketService.getAllTickets fetching', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('HTTP error');
    const data = await response.json();
    if (response.ok && data.success) return data.tickets || [];
    return [];
  } catch (e) {
    console.error('ticketService.getAllTickets', e);
    return [];
  }
};

export const getTicket = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/ticket/${id}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.ticket;
    throw new Error('Ticket non trovato');
  } catch (e) {
    console.error('ticketService.getTicket', e);
    throw e;
  }
};

export const getAllReplies = async (idTicket) => {
  try {
    const response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    if (response.ok && data.success) return data.replies || [];
    return [];
  } catch (e) {
    console.error('ticketService.getAllReplies', e);
    return [];
  }
};

export const postReply = async (idTicket, reply) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket/${idTicket}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reply)
    });
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.postReply', e);
    return false;
  }
};

export const closeTicket = async (idTicket) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket/${idTicket}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.closeTicket', e);
    return false;
  }
};

export const postTicket = async (ticket) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');

    if (!token) throw new Error('Non autenticato');

    const response = await fetch(`${API_BASE}/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ticket)
    });

    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('ticketService.postTicket', e);
    return false;
  }
};
