/**
 * ===============================================================================
 * TattvaAI - PrivateRoute Guard
 * ===============================================================================
 * Protects internal platform routes (Dashboard, Investigation, History, Reports, Settings).
 * Redirects unauthenticated users to /login while preserving target route in state.
 * ===============================================================================
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ProgressSpinner } from "primereact/progressspinner";

export default function PrivateRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div 
                className="flex align-items-center justify-content-center min-h-screen" 
                style={{ background: "var(--surface-ground)" }}
            >
                <div className="text-center p-4">
                    <ProgressSpinner 
                        style={{ width: "36px", height: "36px" }} 
                        strokeWidth="4" 
                        fill="transparent"
                        animationDuration=".8s"
                    />
                    <p className="text-color-secondary text-xs mt-3 font-medium">
                        Verifying session credentials...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children ? children : <Outlet />;
}
