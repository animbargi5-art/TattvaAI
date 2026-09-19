import api from "../api/interceptors.js";

class DashboardService {
    constructor() {
        this.baseEndpoint = "/dashboard";
        // Auto-bind all methods so they can be safely passed to React Query (queryFn, etc.)
        const proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(proto)
            .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
            .forEach(method => {
                this[method] = this[method].bind(this);
            });
    }

    // Get dashboard statistics
    async getDashboardStats() {
        const base = this?.baseEndpoint || "/dashboard";
        const response = await api.get(`${base}/statistics`);
        return response.data;
    }

    // Alias for getDashboardStats
    async getDashboardStatistics() {
        return this.getDashboardStats();
    }

    // Get investigation status
    async getInvestigationStatus() {
        // Investigations run synchronously today. Keep a stable UI contract
        // until the backend exposes a persisted progress endpoint.
        return { status: 'idle' };
    }

    // Alias for active investigations
    async getActiveInvestigations() {
        return [];
    }

    // Get recent investigations (accepts number or object with limit)
    async getRecentInvestigations(paramsOrLimit = 5) {
        const base = this?.baseEndpoint || "/dashboard";
        const limit = typeof paramsOrLimit === 'object' && paramsOrLimit !== null
            ? (paramsOrLimit.limit ?? 5)
            : paramsOrLimit;

        const response = await api.get(`${base}/recent`, {
            params: { limit }
        });
        return response.data.investigations ?? [];
    }

    // Get system health
    async getSystemHealth() {
        const base = this?.baseEndpoint || "/dashboard";
        const response = await api.get(`${base}/health-overview`);
        return response.data;
    }

    // Alias for system health
    async getSystemStatus() {
        return this.getSystemHealth();
    }

    // Get backend connection status
    async getBackendStatus() {
        const response = await api.get("/health");
        return response.data;
    }

    // Get SigNoz connection status
    async getSigNozStatus() {
        const base = this?.baseEndpoint || "/dashboard";
        const response = await api.get(`${base}/signoz-status`);
        return response.data;
    }
}

export const dashboardService = new DashboardService();
export default dashboardService;
