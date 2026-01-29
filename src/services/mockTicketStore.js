import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mock_tickets_v1';

const sample = [
  { id: 't1', title: 'Buco in strada', description: 'Grande buca in via Roma', lat: 40.675, lon: 14.769, status: 'open', user: 'Mario Rossi', replies: [], images: [] },
  { id: 't2', title: 'Lampione rotto', description: 'Lampione spento vicino al parco', lat: 40.678, lon: 14.772, status: 'open', user: 'Luigi Bianchi', replies: [], images: [] }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export const initMock = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) {
      await AsyncStorage.setItem(KEY, JSON.stringify(sample));
    }
  } catch (e) {
    console.warn('mockTicketStore.init', e);
  }
};

export const getAll = async () => {
  try {
    await sleep(200);
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : [];
  } catch (e) {
    console.warn('mockTicketStore.getAll', e);
    return [];
  }
};

export const getById = async (id) => {
  try {
    const all = await getAll();
    return all.find(t => t.id === id);
  } catch (e) {
    console.warn('mockTicketStore.getById', e);
    return null;
  }
};

export const addTicket = async (ticket) => {
  try {
    const all = await getAll();
    const newTicket = { id: `t_${Date.now()}`, ...ticket };
    all.push(newTicket);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return newTicket;
  } catch (e) {
    console.warn('mockTicketStore.addTicket', e);
    return null;
  }
};

export const addReply = async (ticketId, reply) => {
  try {
    const all = await getAll();
    const t = all.find(x => x.id === ticketId);
    if (!t) return false;
    t.replies = t.replies || [];
    t.replies.push({ id: `r_${Date.now()}`, text: reply.text, author: reply.author || 'Anon', images: reply.images || [] });
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.warn('mockTicketStore.addReply', e);
    return false;
  }
};

export const closeTicket = async (ticketId) => {
  try {
    const all = await getAll();
    const t = all.find(x => x.id === ticketId);
    if (!t) return false;
    t.status = 'closed';
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.warn('mockTicketStore.closeTicket', e);
    return false;
  }
};

export const updateTicket = async (ticketId, updates) => {
  try {
    const all = await getAll();
    const t = all.find(x => x.id === ticketId);
    if (!t) return false;
    Object.assign(t, updates);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.warn('mockTicketStore.updateTicket', e);
    return false;
  }
};

export const assignTicket = async (ticketId, operatorName) => {
  return updateTicket(ticketId, { assignedTo: operatorName, status: 'in_lavorazione' });
};
