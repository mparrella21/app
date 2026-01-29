import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mock_users_v1';
const sample = [
  { id: 'u1', name: 'Operatore Mario', email: 'mario@comune.it', role: 'operatore' },
  { id: 'u2', name: 'Responsabile Anna', email: 'anna@comune.it', role: 'responsabile' }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export const initUsers = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) await AsyncStorage.setItem(KEY, JSON.stringify(sample));
  } catch (e) { console.warn('mockUserStore.init', e); }
};

export const getAllUsers = async () => {
  try {
    await sleep(150);
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : [];
  } catch (e) { console.warn('mockUserStore.getAllUsers', e); return []; }
};

export const addUser = async (u) => {
  try {
    const all = await getAllUsers();
    const newU = { id: `u_${Date.now()}`, ...u };
    all.push(newU);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return newU;
  } catch (e) { console.warn('mockUserStore.addUser', e); return null; }
};

export const updateUser = async (id, updates) => {
  try {
    const all = await getAllUsers();
    const u = all.find(x=>x.id===id);
    if (!u) return false;
    Object.assign(u, updates);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch (e) { console.warn('mockUserStore.updateUser', e); return false; }
};

export const deleteUser = async (id) => {
  try {
    const all = await getAllUsers();
    const filtered = all.filter(x=>x.id!==id);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
    return true;
  } catch (e) { console.warn('mockUserStore.deleteUser', e); return false; }
};
