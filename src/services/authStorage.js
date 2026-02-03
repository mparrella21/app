import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACCESS_TOKEN = 'app_access_token';
const KEY_REFRESH_TOKEN = 'app_refresh_token';

// Salva entrambi i token (Accesso e Refresh) inviati dal server
export const setAuthTokens = async (accessToken, refreshToken) => {
  try {
    await AsyncStorage.setItem(KEY_ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(KEY_REFRESH_TOKEN, refreshToken);
    }
  } catch (e) {
    console.error("Errore nel salvataggio dei token", e);
  }
};

// Recupera i token salvati (usato all'avvio dell'app)
export const getAuthTokens = async () => {
  try {
    const access_token = await AsyncStorage.getItem(KEY_ACCESS_TOKEN);
    const refresh_token = await AsyncStorage.getItem(KEY_REFRESH_TOKEN);
    
    return { access_token, refresh_token };
  } catch (e) {
    console.error("Errore nel recupero dei token", e);
    return null;
  }
};

// Elimina i token (usato per il Logout)
export const clearAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem(KEY_ACCESS_TOKEN);
    await AsyncStorage.removeItem(KEY_REFRESH_TOKEN);
  } catch (e) {
    console.error("Errore durante la pulizia dei token", e);
  }
};