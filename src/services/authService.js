import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth service: login / register / logout against API Gateway (Auth Service)

export const login = async (email, password) => {
  try {
    // Coerente con UC-01 e Diagramma 02 LOGIN
    const response = await fetch(`http://192.168.72.107:32413/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && (data.token || data.access_token)) {
      // Il backend restituisce token e user
      return { 
          success: true, 
          token: data.token || data.access_token, 
          user: data.user 
      };
    }

    return { success: false, error: data.message || 'Login fallito' };
  } catch (e) {
    console.error('AuthService.login', e);
    return { success: false, error: 'Errore di rete' };
  }
};

export const register = async (userData) => {
  try {
    // Coerente con UC-02 e Diagramma 01 REGISTER
    const response = await fetch(`http://192.168.72.107:32413/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (response.ok) {
        // Se il backend segue il diagramma 01, restituisce GIA' i token qui.
        // Supportiamo sia il caso "Auto-login" sia il caso "Solo successo".
        if (data.token || data.access_token) {
            return { 
                success: true, 
                token: data.token || data.access_token, 
                user: data.user 
            };
        }
        return { success: true };
    }

    return { success: false, error: data.message || 'Registrazione fallita' };
  } catch (e) {
    console.error('AuthService.register', e);
    return { success: false, error: 'Errore di rete' };
  }
};

export const logout = async () => {
    try {
        // Coerente con Diagramma 04 LOGOUT
        const token = await AsyncStorage.getItem('app_auth_token');
        if (!token) return;

        await fetch(`http://192.168.72.107:32413/auth/logout`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            }
        });
    } catch (e) {
        console.warn('Logout API failed', e);
        // Procediamo comunque al logout locale
    }
};