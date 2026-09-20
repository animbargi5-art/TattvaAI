/**
 * ===============================================================================
 * TattvaAI - SignupPage
 * ===============================================================================
 * Dense, developer-tool styled registration page.
 * Creates an engineer profile on /auth/signup and initializes a 7-day JWT session.
 * ===============================================================================
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { useAuth } from "../contexts/AuthContext";

const DISALLOWED_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com",
    "hotmail.com", "outlook.com", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com",
    "aol.com", "aim.com",
    "proton.me", "protonmail.com", "pm.me",
    "zoho.com", "zohomail.com",
    "gmx.com", "gmx.net", "mail.com", "yandex.com", "yandex.ru", "mail.ru",
    "inbox.com", "fastmail.com", "hushmail.com", "tutanota.com", "tuta.io",
]);

function isWorkEmail(email) {
    if (!email || !email.includes("@")) return false;
    const parts = email.trim().toLowerCase().split("@");
    if (parts.length !== 2) return false;
    return !DISALLOWED_DOMAINS.has(parts[1]);
}

export default function SignupPage() {
    const navigate = useNavigate();
    const { signup, isAuthenticated } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // If already authenticated, redirect immediately
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!name.trim()) {
            setErrorMessage("Please enter your full name.");
            return;
        }

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
            setErrorMessage("Please enter your work email.");
            return;
        }

        if (!isWorkEmail(cleanEmail)) {
            setErrorMessage("Please use your work or organization email address.");
            return;
        }

        if (!password || password.length < 6) {
            setErrorMessage("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            await signup(name.trim(), cleanEmail, password);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            console.error("[Signup] Registration failed:", err);
            setErrorMessage(err.message || "Failed to create account. Please try again.");
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
                    <h1 className="auth-title">Create an engineer account</h1>
                    <p className="auth-subtitle">
                        Start investigating production incidents with telemetry intelligence
                    </p>
                </div>

                {errorMessage && (
                    <div className="auth-error-banner flex flex-column gap-2">
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-exclamation-circle text-lg"></i>
                            <span className="font-medium text-sm">{errorMessage}</span>
                        </div>
                        {errorMessage.toLowerCase().includes("already exists") && (
                            <div className="mt-1 pt-1 border-top-1 border-red-200">
                                <Link 
                                    to="/login" 
                                    className="font-bold text-sm text-primary hover:underline flex align-items-center gap-1"
                                >
                                    <span>Sign in to existing account</span>
                                    <i className="pi pi-arrow-right text-xs"></i>
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="signup-name" className="auth-label">
                            Full Name
                        </label>
                        <InputText
                            id="signup-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Smith"
                            className="auth-input"
                            autoComplete="name"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-email" className="auth-label">
                            Work Email
                        </label>
                        <InputText
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="alex@company.com"
                            className="auth-input"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-password" className="auth-label">
                            Password
                        </label>
                        <InputText
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="auth-input"
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        label={isLoading ? "Creating Account..." : "Create Account"}
                        icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-user-plus"}
                        disabled={isLoading}
                        className="auth-btn-primary mt-2"
                    />
                </form>

                <div className="auth-footer-text">
                    Already have an account?
                    <Link to="/login" className="auth-footer-link">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
