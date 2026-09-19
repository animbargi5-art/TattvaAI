import api from "../api/interceptors.js";

class InvestigationService {
    constructor() {
        this.baseEndpoint = "/investigation";
        // Auto-bind all methods so they can be safely passed to React Query (queryFn, mutationFn)
        const proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(proto)
            .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
            .forEach(method => {
                this[method] = this[method].bind(this);
            });
    }

    // Start new investigation
    async startInvestigation(params = {}) {
        const base = this?.baseEndpoint || "/investigation";
        const {
            service_name = "gateway",
            telemetry_source = "mock",
            environment = "production",
            time_window = "15m",
            ...otherParams
        } = params;
        const queryParams = new URLSearchParams();
        if (service_name) queryParams.append("service_name", service_name);
        if (telemetry_source) queryParams.append("telemetry_source", telemetry_source);
        if (environment) queryParams.append("environment", environment);
        if (time_window) queryParams.append("time_window", time_window);

        const payload = {
            service_name,
            telemetry_source,
            environment,
            time_window,
            ...otherParams
        };

        const queryString = queryParams.toString();
        const url = queryString ? `${base}/start?${queryString}` : `${base}/start`;
        const response = await api.post(url, payload);
        return response.data;
    }

    // Alias for startInvestigation
    async createInvestigation(params = {}) {
        return this.startInvestigation(params);
    }

    // Get investigation details by ID
    async getInvestigationById(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}`);
        return response.data;
    }

    // Alias for getInvestigationById
    async getInvestigation(id) {
        return this.getInvestigationById(id);
    }

    // Get investigation progress
    async getInvestigationProgress(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/progress`);
        return response.data;
    }

    // Alias for progress / status
    async getInvestigationStatus(id) {
        if (!id || id === 'undefined' || id === 'null') {
            return { status: 'idle' };
        }
        try {
            return await this.getInvestigationProgress(id);
        } catch {
            return { status: 'idle' };
        }
    }

    // Stop investigation stub
    async stopInvestigation(id) {
        return { status: 'stopped', incident_id: id };
    }

    // Update investigation stub
    async updateInvestigation(id, data) {
        return { incident_id: id, ...data };
    }

    // Get investigation history with optional filters
    async getInvestigationHistory(filters = {}) {
        const base = this?.baseEndpoint || "/investigation";
        const params = new URLSearchParams();
        
        // Add filters to query params
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, value);
                }
            }
        });

        const queryString = params.toString();
        const url = queryString ? `${base}/history?${queryString}` : `${base}/history`;
        
        const response = await api.get(url);
        return response.data;
    }

    // Alias for getInvestigationHistory
    async getAllInvestigations(filters = {}) {
        return this.getInvestigationHistory(filters);
    }

    // Delete investigation
    async deleteInvestigation(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required for deletion');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.delete(`${base}/${id}`);
        return response.data;
    }

    // Refresh investigation (re-run analysis)
    async refreshInvestigation(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required for refresh');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.post(`${base}/${id}/refresh`);
        return response.data;
    }

    // Get investigation evidence
    async getInvestigationEvidence(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/evidence`);
        return response.data;
    }

    // Get investigation timeline
    async getInvestigationTimeline(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/timeline`);
        return response.data;
    }

    // Get investigation correlation graph
    async getInvestigationGraph(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/graph`);
        return response.data;
    }

    // Export investigation report
    async exportInvestigation(id, format = 'pdf') {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required for export');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/export`, {
            params: { format },
            responseType: 'blob'
        });

        // Trigger file download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `investigation-${id}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return response.data;
    }

    // Bulk delete stub / fallback
    async bulkDeleteInvestigations(ids) {
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.delete(`${base}/bulk`, {
            data: { investigation_ids: ids }
        });
        return response.data;
    }

    // Bulk export stub / fallback
    async bulkExportInvestigations(ids, format = 'pdf') {
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.post(`${base}/bulk-export`, {
            investigation_ids: ids,
            format
        }, {
            responseType: 'blob'
        });
        return response.data;
    }

    // Get human review state
    async getReview(id) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.get(`${base}/${id}/review`);
        return response.data;
    }

    // Submit human review decision
    async submitReview(id, reviewData) {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required to submit review');
        }
        const base = this?.baseEndpoint || "/investigation";
        const response = await api.post(`${base}/${id}/review`, reviewData);
        return response.data;
    }
}

export const investigationService = new InvestigationService();
export default investigationService;