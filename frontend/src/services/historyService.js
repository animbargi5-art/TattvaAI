import api from "../api/interceptors.js";

class HistoryService {
    constructor() {
        this.baseEndpoint = "/investigation";
        // Auto-bind all methods so they can be safely passed to React Query (queryFn, etc.)
        const proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(proto)
            .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
            .forEach(method => {
                this[method] = this[method].bind(this);
            });
    }

    // Get all investigations for DataTable  
    async getAllInvestigations(params = {}) {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/history`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching investigations:', error);
            throw error;
        }
    }

    // Get investigation by ID
    async getInvestigationById(id) {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching investigation ${id}:`, error);
            throw error;
        }
    }

    // Search investigations with advanced filters
    async searchInvestigations(searchParams = {}) {
        const base = this?.baseEndpoint || "/investigation";
        const {
            query = '',
            severity = null,
            status = null,
            dateFrom = null,
            dateTo = null,
            page = 0,
            size = 20,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = searchParams;

        const params = new URLSearchParams();
        
        if (query) params.append('query', query);
        if (severity) {
            if (Array.isArray(severity)) {
                severity.forEach(s => params.append('severity', s));
            } else {
                params.append('severity', severity);
            }
        }
        if (status) {
            if (Array.isArray(status)) {
                status.forEach(s => params.append('status', s));
            } else {
                params.append('status', status);
            }
        }
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        
        params.append('page', page.toString());
        params.append('size', size.toString());
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);

        const response = await api.get(`${base}/search?${params}`);
        return response.data;
    }

    // Delete investigation
    async deleteInvestigation(id) {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.delete(`${base}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting investigation ${id}:`, error);
            throw error;
        }
    }

    // Export investigation
    async exportInvestigation(id, format = 'pdf') {
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Valid investigation ID is required for export');
        }
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/${id}/export`, {
                params: { format },
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `investigation-${id}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return response.data;
        } catch (error) {
            console.error(`Error exporting investigation ${id}:`, error);
            throw error;
        }
    }

    // Get filter options
    async getFilterOptions() {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/filters`);
            return response.data;
        } catch (error) {
            console.error('Error fetching filter options:', error);
            throw error;
        }
    }

    // Get investigation summary for history view
    async getInvestigationSummary(id) {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/${id}/summary`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching investigation summary ${id}:`, error);
            throw error;
        }
    }

    // Bulk operations
    async bulkDeleteInvestigations(ids) {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.delete(`${base}/bulk`, {
                data: { investigation_ids: ids }
            });
            return response.data;
        } catch (error) {
            console.error('Error bulk deleting investigations:', error);
            throw error;
        }
    }

    async bulkExport(investigationIds, format = 'pdf') {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.post(`${base}/bulk-export`, {
                investigation_ids: investigationIds,
                format
            }, {
                responseType: 'blob'
            });
            
            // Create download link for zip file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `investigations-export.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return response.data;
        } catch (error) {
            console.error('Error bulk exporting investigations:', error);
            throw error;
        }
    }

    // Export search results
    async exportSearchResults(searchParams, format = 'csv') {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const params = new URLSearchParams(searchParams);
            params.append('format', format);

            const response = await api.get(`${base}/export?${params}`, {
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `investigations-export.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return response.data;
        } catch (error) {
            console.error('Error exporting search results:', error);
            throw error;
        }
    }

    // Statistics and analytics
    async getInvestigationStats() {
        const base = this?.baseEndpoint || "/investigation";
        try {
            const response = await api.get(`${base}/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching investigation stats:', error);
            throw error;
        }
    }

    // Client-side utility functions for fallback
    filterByDateRange(investigations, startDate, endDate) {
        if (!startDate && !endDate) return investigations;
        
        return investigations.filter(investigation => {
            const createdDate = new Date(investigation.created_at);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');
            
            return createdDate >= start && createdDate <= end;
        });
    }

    filterBySeverity(investigations, severities) {
        if (!severities || severities.length === 0) return investigations;
        return investigations.filter(investigation => 
            severities.includes(investigation.severity)
        );
    }

    filterByStatus(investigations, statuses) {
        if (!statuses || statuses.length === 0) return investigations;
        return investigations.filter(investigation => 
            statuses.includes(investigation.status)
        );
    }

    searchInvestigations_clientSide(investigations, searchTerm) {
        if (!searchTerm) return investigations;
        
        const term = searchTerm.toLowerCase();
        return investigations.filter(investigation =>
            investigation.title?.toLowerCase().includes(term) ||
            investigation.incident_id?.toLowerCase().includes(term) ||
            investigation.description?.toLowerCase().includes(term)
        );
    }

    sortInvestigations_clientSide(investigations, sortBy, sortOrder = 'desc') {
        return [...investigations].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'created_at':
                    aVal = new Date(a.created_at);
                    bVal = new Date(b.created_at);
                    break;
                case 'title':
                    aVal = a.title?.toLowerCase() || '';
                    bVal = b.title?.toLowerCase() || '';
                    break;
                case 'severity':
                    const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
                    aVal = severityOrder[a.severity] || 0;
                    bVal = severityOrder[b.severity] || 0;
                    break;
                case 'confidence':
                    aVal = a.confidence || 0;
                    bVal = b.confidence || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Data transformation utilities
    transformForExport(investigations) {
        return investigations.map(inv => ({
            'Incident ID': inv.incident_id,
            'Title': inv.title,
            'Severity': inv.severity,
            'Status': inv.status,
            'Confidence': `${inv.confidence}%`,
            'Created': new Date(inv.created_at).toLocaleString(),
            'Duration': inv.duration ? `${inv.duration}ms` : 'N/A'
        }));
    }

    // Analytics functions
    getInvestigationsBySeverity(investigations) {
        return investigations.reduce((acc, inv) => {
            acc[inv.severity] = (acc[inv.severity] || 0) + 1;
            return acc;
        }, {});
    }

    getInvestigationsByStatus(investigations) {
        return investigations.reduce((acc, inv) => {
            acc[inv.status] = (acc[inv.status] || 0) + 1;
            return acc;
        }, {});
    }

    getAverageConfidence(investigations) {
        if (investigations.length === 0) return 0;
        const total = investigations.reduce((sum, inv) => sum + (inv.confidence || 0), 0);
        return Math.round(total / investigations.length);
    }

    getInvestigationTrends(investigations, days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        const recent = investigations.filter(inv => 
            new Date(inv.created_at) >= cutoff
        );
        
        return recent.reduce((acc, inv) => {
            const date = new Date(inv.created_at).toDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
    }
}

export const historyService = new HistoryService();
export default historyService;