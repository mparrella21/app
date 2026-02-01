import { API_BASE } from './config';

// Auth service: login / register against existing PHP API
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { token: data.token, user: data.user };
    }

    return { error: data.message || 'Login fallito' };
  } catch (e) {
    console.error('AuthService.login', e);
    return { error: 'Errore di rete' };
  }
};

export const register = async (name, email, password) => {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true };
    }

    return { error: data.message || 'Registrazione fallita' };
  } catch (e) {
    console.error('AuthService.register', e);
    return { error: 'Errore di rete' };
  }
};
