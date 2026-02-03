import { API_BASE } from './config';
import { authenticatedFetch, register } from './authService';
import { getOperatorCategories, getOperatorMappings, assignOperatorCategory } from './interventionService';

export const getAllUsers = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) { return []; }
};

export const getUserById = async (id) => {
    try {
        const response = await authenticatedFetch(`${API_BASE}/user/${id}`, { method: 'GET' });
        if (response.ok) return await response.json();
        return null;
    } catch (e) { return null; }
};

export const updateProfile = async (userId, profileData) => {
    try {
        const payload = {
            name: profileData.name,
            surname: profileData.surname,
            phonenumber: profileData.phonenumber,
            birth_date: profileData.birth_date
        };
        const response = await authenticatedFetch(`${API_BASE}/user/${userId}`, {
            method: 'POST', 
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (e) { return false; }
};

export const deleteUser = async (userId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/user/${userId}`, { method: 'DELETE' });
    return response.ok;
  } catch (e) { return false; }
};

// ADATTATO ALLA NUOVA LOGICA: Creazione operatore completo di mapping
export const createOperator = async (operatorData, tenantId, categoryId) => {
  try {
    // 1. Registra l'utente come operatore per questo tenant
    const regResult = await register({
        email: operatorData.email,
        password: operatorData.password,
        name: operatorData.name,
        surname: operatorData.surname,
        phoneNumber: operatorData.phoneNumber,
        role: 'operatore',
        tenant_id: tenantId
    });

    if (!regResult.success || !regResult.user?.id) return { success: false };

    // 2. Se è stata scelta una categoria, gliela assegna via mapping (nuova logica API)
    if (categoryId) {
        await assignOperatorCategory(regResult.user.id, tenantId, categoryId);
    }

    return { success: true, id: regResult.user.id };
  } catch (e) { return { success: false }; }
};

// ADATTATO ALLA NUOVA LOGICA: Filtra operatori usando i mapping tenant/operatore
export const getOperatorsByTenant = async (tenantId) => {
  try {
    const allUsers = await getAllUsers();
    const mappings = await getOperatorMappings(tenantId);
    const categories = await getOperatorCategories();

    const operatorUserIds = mappings.map(m => m.id_user);
    let operators = allUsers.filter(u => operatorUserIds.includes(u.id));

    // Arricchimento dati con il nome della categoria
    operators = operators.map(op => {
        const userMap = mappings.find(m => m.id_user === op.id);
        if (userMap) {
            const cat = categories.find(c => String(c.id) === String(userMap.id_operator_category));
            if (cat) return { ...op, category: cat.label, category_id: cat.id };
        }
        return { ...op, category: 'Non assegnato' };
    });

    return operators;
  } catch (e) { return []; }
};