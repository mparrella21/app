import { API_BASE } from './config';

// Auth service: login / register against API Gateway (Auth Service)

export const login = async (email, password) => {
  try {
    // [FIX] Aggiunto prefisso /auth come da specifica architetturale (POST /auth/login)
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Il backend restituisce token e user
      return { token: data.token || data.access_token, user: data.user };
    }

    return { error: data.message || 'Login fallito' };
  } catch (e) {
    console.error('AuthService.login', e);
    return { error: 'Errore di rete' };
  }
};

export const register = async (userData) => {
  try {
    // [FIX] Aggiunto prefisso /auth e supporto per oggetto userData completo
    // Endpoint: POST /auth/register
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(userData)
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