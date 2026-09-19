/**
 * ===============================================================================
 * TattvaAI - Authentication Service
 * ===============================================================================
 * Communicates with FastAPI backend for:
 * • POST /auth/signup - Register new SRE account
 * • POST /auth/login  - Authenticate and receive JWT
 * • GET  /auth/me     - Fetch current user profile
 * ===============================================================================
 */

import api from "../api/interceptors.js";

class AuthService {
    /**
     * Register a new user
     * @param {Object} payload - { name, email, password }
     * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
     */
    async signup({ name, email, password }) {
        const response = await api.post("/auth/signup", {
            full_name: name,
            email: email.trim().toLowerCase(),
            password: password,
        });
        return response.data;
    }

    /**
     * Authenticate existing user
     * @param {Object} credentials - { email, password }
     * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
     */
    async login({ email, password }) {
        const response = await api.post("/auth/login", {
            email: email.trim().toLowerCase(),
            password: password,
        });
        return response.data;
    }

    /**
     * Retrieve currently logged-in user profile from JWT
     * @returns {Promise<Object>}
     */
    async getCurrentUser() {
        const response = await api.get("/auth/me");
        return response.data;
    }
}

const authService = new AuthService();
export default authService;
