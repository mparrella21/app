import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

export const getGlobalVolumes = async () => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/admin/stats/global-volumes`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { console.error(e); return null; }
};

export const getComparativePerformance = async () => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/admin/stats/comparative-performance`, { method: 'GET' });
        if(res.ok) return await res.json();
        return [];
    } catch (e) { console.error(e); return []; }
};

export const getCategoriesDistribution = async () => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/admin/stats/categories-distribution`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { console.error(e); return null; }
};

export const getGeoDistribution = async () => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/admin/stats/geo-distribution`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { console.error(e); return null; }
};