/*
su file di login fare tipo---------------

import { login } from '../services/authService';
import { saveAuth } from '../services/authStorage';

const onLogin = async () => {
  const result = await login(email, password);

  if (result.error) {
    Alert.alert('Errore', result.error);
    return;
  }

  await saveAuth(result.token, result.user); //salva utente in storage locale
  navigation.replace('Home');
};

su file per logout fare tipo------------------------------
import { logout } from '../services/authStorage';

await logout();
navigation.replace('Login');
[...]


//quando una schermata richiede info su utente----------------
import { getCurrentUser } from '../services/authStorage';
const user = await getCurrentUser();
 [...]



*/


import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN = 'app_auth_token';
const KEY_USER = 'app_user';

export const saveAuth = async (token, user) => {
  await AsyncStorage.setItem(KEY_TOKEN, token);
  await AsyncStorage.setItem(KEY_USER, JSON.stringify(user));
};

export const getToken = async () => {
  return AsyncStorage.getItem(KEY_TOKEN);
};

export const getCurrentUser = async () => {
  const user = await AsyncStorage.getItem(KEY_USER);
  return user ? JSON.parse(user) : null;
};

export const logout = async () => {
  await AsyncStorage.removeItem(KEY_TOKEN);
  await AsyncStorage.removeItem(KEY_USER);
};
