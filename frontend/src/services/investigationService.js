import api from "../api/interceptors.js";

class InvestigationService {
    constructor() {
        this.baseEndpoint = "/investigation";
    }

    // Start new investigation
    async startInvestigation(params = {}) {
        const { service_name = "gateway", ...otherParams } = params;
        const response = await api.post(`${this.baseEndpoint}/start?service_name=${service_name}`, otherParams);
        return response.data;
    }

    // Get investigation details by ID
    async getInvestigationById(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}`);
        return response.data;
    }

    // Get investigation progress
    async getInvestigationProgress(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}/progress`);
        return response.data;
    }

    // Get investigation history with optional filters
    async getInvestigationHistory(filters = {}) {
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
        const url = queryString ? `${this.baseEndpoint}/history?${queryString}` : `${this.baseEndpoint}/history`;
        
        const response = await api.get(url);
        return response.data;
    }

    // Delete investigation
    async deleteInvestigation(id) {
        const response = await api.delete(`${this.baseEndpoint}/${id}`);
        return response.data;
    }

    // Refresh investigation (re-run analysis)
    async refreshInvestigation(id) {
        const response = await api.post(`${this.baseEndpoint}/${id}/refresh`);
        return response.data;
    }

    // Get investigation evidence
    async getInvestigationEvidence(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}/evidence`);
        return response.data;
    }

    // Get investigation timeline
    async getInvestigationTimeline(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}/timeline`);
        return response.data;
    }

    // Get investigation correlation graph
    async getInvestigationGraph(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}/graph`);
        return response.data;
    }

    // Export investigation report
    async exportInvestigation(id, format = 'pdf') {
        const response = await api.get(`${this.baseEndpoint}/${id}/export`, {
            params: { format },
            responseType: 'blob'
        });
        return response.data;
    }

    // Get human review state
    async getReview(id) {
        const response = await api.get(`${this.baseEndpoint}/${id}/review`);
        return response.data;
    }

    // Submit human review decision
    async submitReview(id, reviewData) {
        const response = await api.post(`${this.baseEndpoint}/${id}/review`, reviewData);
        return response.data;
    }
}

export default new InvestigationService();