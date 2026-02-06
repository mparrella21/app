import { API_BASE } from './config';
import { authenticatedFetch } from './authService';

export const getTicketStatusStats = async (tenantId) => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/manager/stats/tickets-status?tenant_id=${tenantId}`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { return null; }
};

export const getResponseTimeStats = async (tenantId) => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/manager/stats/response-times?tenant_id=${tenantId}`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { return null; }
};

export const getOperatorPerformanceStats = async (tenantId) => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/manager/stats/operator-performance?tenant_id=${tenantId}`, { method: 'GET' });
        if(res.ok) return await res.json();
        return [];
    } catch (e) { return []; }
};

export const getTicketTrendsStats = async (tenantId) => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/manager/stats/ticket-trends?tenant_id=${tenantId}`, { method: 'GET' });
        if(res.ok) return await res.json();
        return [];
    } catch (e) { return []; }
};

export const getAssignmentCoverageStats = async (tenantId) => {
    try {
        const res = await authenticatedFetch(`${API_BASE}/metrics/manager/stats/assignment-coverage?tenant_id=${tenantId}`, { method: 'GET' });
        if(res.ok) return await res.json();
        return null;
    } catch (e) { return null; }
};