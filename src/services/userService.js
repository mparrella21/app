import { API_BASE } from './config';
import { getToken } from './authStorage';

export const getAllUsers = async () => {
  try {
    const token = await getToken();

    const response = await fetch(`${API_BASE}/users`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Unathorized');

    const data = await response.json();
    return data.success ? data.users : [];
  } catch (e) {
    console.error('userService.getAllUsers', e);
    return [];
  }
};

export const updateUserRole = async (id, role) => {
  try {
    const token = await getToken();

    const response = await fetch(`${API_BASE}/users/${id}/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });

    const data = await response.json();
    return response.ok && data.success;
  } catch (e) {
    console.error('userService.updateUserRole', e);
    return false;
  }
};
