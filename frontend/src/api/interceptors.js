import api from './axios.js';

// Global error handler for toast notifications
let toastRef = null;

export const setToastRef = (ref) => {
    toastRef = ref;
};

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for debugging
        config.metadata = { startTime: new Date() };
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Log response time in development
        if (import.meta.env.DEV) {
            const endTime = new Date();
            const duration = endTime - response.config.metadata.startTime;
            console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
        }
        
        return response;
    },
    (error) => {
        // Handle different types of errors
        let errorMessage = 'An unexpected error occurred';
        let severity = 'error';

        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            
            switch (status) {
                case 400:
                    errorMessage = data.detail || 'Bad request';
                    severity = 'warn';
                    break;
                case 401:
                    errorMessage = data.detail || 'Authentication required';
                    // Redirect to login if implemented
                    break;
                case 403:
                    errorMessage = data.detail || 'Access forbidden';
                    break;
                case 404:
                    errorMessage = data.detail || 'Resource not found';
                    severity = 'warn';
                    break;
                case 409:
                    errorMessage = data.detail || 'An account with this email already exists. Please sign in.';
                    severity = 'warn';
                    break;
                case 422:
                    errorMessage = data.detail?.[0]?.msg || 'Validation error';
                    severity = 'warn';
                    break;
                case 500:
                    errorMessage = 'Internal server error. Please try again later.';
                    break;
                default:
                    errorMessage = data.detail || `Server error (${status})`;
            }
        } else if (error.request) {
            // Request made but no response received
            errorMessage = 'Network error. Please check your connection.';
        } else {
            // Something else happened
            errorMessage = error.message || 'Request failed';
        }

        // Show toast notification if available
        if (toastRef?.current) {
            toastRef.current.show({
                severity,
                summary: severity === 'error' ? 'Error' : 'Warning',
                detail: errorMessage,
                life: 5000
            });
        }

        // Log error in development
        if (import.meta.env.DEV) {
            console.error('API Error:', error);
        }

        return Promise.reject(new Error(errorMessage));
    }
);

export default api;