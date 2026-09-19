/**
 * ===============================================================================
 * TattvaAI - LoginPage
 * ===============================================================================
 * Dense, developer-tool styled login page (Linear/Vercel aesthetic).
 * Authenticates against /auth/login and stores persistent JWT session.
 * ===============================================================================
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Target route if redirected by PrivateRoute
    const from = location.state?.from?.pathname || "/dashboard";

    // If already authenticated, redirect immediately
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!email.trim() || !password) {
            setErrorMessage("Please enter both email and password.");
            return;
        }

        setIsLoading(true);
        try {
            await login(email.trim(), password);
            navigate(from, { replace: true });
        } catch (err) {
            console.error("[Login] Authentication failed:", err);
            setErrorMessage(err.message || "Invalid email or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <Link to="/" className="auth-brand">
                        <i className="pi pi-bolt"></i>
                        <span>TattvaAI</span>
                    </Link>
                    <h1 className="auth-title">Sign in to your account</h1>
                    <p className="auth-subtitle">
                        Incident investigation and telemetry intelligence platform
                    </p>
                </div>

                {errorMessage && (
                    <div className="auth-error-banner">
                        <i className="pi pi-exclamation-circle"></i>
                        <span>{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="login-email" className="auth-label">
                            Work Email
                        </label>
                        <InputText
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="engineer@company.com"
                            className="auth-input"
                            autoComplete="email"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <div className="flex justify-content-between align-items-center">
                            <label htmlFor="login-password" className="auth-label">
                                Password
                            </label>
                        </div>
                        <InputText
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="auth-input"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <div className="flex align-items-center justify-content-between pt-1">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="remember-me"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.checked)}
                            />
                            <label htmlFor="remember-me" className="text-xs text-color-secondary cursor-pointer">
                                Remember session
                            </label>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        label={isLoading ? "Signing in..." : "Sign In"}
                        icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
                        disabled={isLoading}
                        className="auth-btn-primary mt-2"
                    />
                </form>

                <div className="auth-footer-text">
                    Don't have an account?
                    <Link to="/signup" className="auth-footer-link">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
