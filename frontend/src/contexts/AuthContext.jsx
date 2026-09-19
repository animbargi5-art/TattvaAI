/**
 * ===============================================================================
 * TattvaAI - Authentication Context & Provider
 * ===============================================================================
 * Manages persistent user session, JWT storage in localStorage (GitHub-style),
 * and provides authentication state to the entire React application.
 * ===============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => {
        return localStorage.getItem("auth_token") || null;
    });

    const [user, setUser] = useState(() => {
        try {
            const cachedUser = localStorage.getItem("auth_user");
            return cachedUser ? JSON.parse(cachedUser) : null;
        } catch (e) {
            return null;
        }
    });

    const [isLoading, setIsLoading] = useState(true);

    // Synchronize session on initial mount
    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem("auth_token");
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            try {
                // Verify with backend that JWT is valid
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
                localStorage.setItem("auth_user", JSON.stringify(currentUser));
            } catch (err) {
                console.warn("[Auth] Session validation failed, logging out:", err.message);
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        try {
            const data = await authService.login({ email, password });
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);
            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signup = useCallback(async (name, email, password) => {
        setIsLoading(true);
        try {
            const data = await authService.signup({ name, email, password });
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);
            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setToken(null);
        setUser(null);
    }, []);

    const value = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;
