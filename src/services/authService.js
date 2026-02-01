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

// Login via Google: invia l'id_token al backend per ricevere token app/user
export const loginWithGoogle = async (idToken) => {
  try {
    if (!idToken) return { error: 'Missing idToken' };

    const payload = { id_token: idToken };

    // Proviamo prima un endpoint comune /auth/google, poi fallback a /login/google
    const endpoints = [`${API_BASE}/auth/google`, `${API_BASE}/login/google`];

    for (let url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const text = await response.text().catch(() => null);
          // try next endpoint
          continue;
        }

        const data = await response.json();
        if (data && (data.token || data.success)) {
          // Normalizziamo: backend potrebbe restituire { token, user } o { success, token, user }
          return { token: data.token, user: data.user };
        }
      } catch (e) {
        console.warn('loginWithGoogle endpoint failed:', e);
      }
    }

    return { error: 'Google login failed on server' };
  } catch (e) {
    console.error('AuthService.loginWithGoogle', e);
    return { error: 'Errore di rete' };
  }
};
