import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import telemetryService from "../../services/telemetryService";
import dashboardService from "../../services/dashboardService";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [backendOnline, setBackendOnline] = useState(true);
    const [telemetryStatus, setTelemetryStatus] = useState({
        provider: "aws",
        name: "AWS Observability",
        connected: true,
        mode: "LIVE",
        text: "AWS Observability — LIVE",
        dotColor: "var(--success)"
    });

    // Check backend health and dynamic telemetry provider status
    const checkStatuses = useCallback(async () => {
        try {
            await dashboardService.getBackendStatus();
            setBackendOnline(true);
        } catch {
            setBackendOnline(false);
        }

        const activeProv = telemetryService.getActiveProvider() || "aws";
        try {
            const testRes = await telemetryService.testProviderConnection({ provider: activeProv });
            if (activeProv === "mock" || activeProv === "demo") {
                setTelemetryStatus({
                    provider: "mock",
                    name: "Mock / Demo",
                    connected: true,
                    mode: "DEMO",
                    text: "Mock / Demo — DEMO",
                    dotColor: "var(--warning)"
                });
            } else if (activeProv === "aws" || activeProv === "cloudwatch") {
                setTelemetryStatus({
                    provider: "aws",
                    name: "AWS Observability",
                    connected: !!testRes.connected,
                    mode: "LIVE",
                    text: testRes.connected ? "AWS Observability — LIVE" : "AWS Observability — NOT CONNECTED",
                    dotColor: testRes.connected ? "var(--success)" : "var(--danger)"
                });
            } else if (activeProv === "signoz") {
                setTelemetryStatus({
                    provider: "signoz",
                    name: "SigNoz",
                    connected: !!testRes.connected,
                    mode: "LIVE",
                    text: testRes.connected ? "SigNoz — LIVE" : "SigNoz — NOT CONNECTED",
                    dotColor: testRes.connected ? "var(--success)" : "var(--danger)"
                });
            } else {
                setTelemetryStatus({
                    provider: activeProv,
                    name: activeProv.toUpperCase(),
                    connected: !!testRes.connected,
                    mode: testRes.mode || "LIVE",
                    text: `${activeProv.toUpperCase()} — ${testRes.connected ? "LIVE" : "NOT CONNECTED"}`,
                    dotColor: testRes.connected ? "var(--success)" : "var(--warning)"
                });
            }
        } catch {
            setTelemetryStatus({
                provider: activeProv,
                name: "Telemetry",
                connected: false,
                mode: "UNKNOWN",
                text: "Telemetry — Status unavailable",
                dotColor: "var(--text-muted)"
            });
        }
    }, []);

    useEffect(() => {
        checkStatuses();
        const interval = setInterval(checkStatuses, 30000);
        const handleProviderChange = () => checkStatuses();
        window.addEventListener("tattvaai:provider-changed", handleProviderChange);
        return () => {
            clearInterval(interval);
            window.removeEventListener("tattvaai:provider-changed", handleProviderChange);
        };
    }, [checkStatuses]);

    const isCurrent = (path) => {
        if (path === "/dashboard") {
            return location.pathname === "/dashboard";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="sidebar-clean">
            {/* Header / Brand */}
            <div className="sidebar-logo-area">
                <div className="sidebar-logo-brand">
                    <i className="pi pi-bolt sidebar-logo-icon"></i>
                    <span className="sidebar-logo-name">TattvaAI</span>
                </div>
                <span className="sidebar-tagline">AI Investigation Platform</span>
            </div>

            {/* Navigation Sections */}
            <div className="sidebar-nav-container">
                {/* Section: MAIN */}
                <div className="sidebar-section-label">MAIN</div>
                <div 
                    className={`sidebar-nav-item ${isCurrent("/dashboard") ? "active" : ""}`}
                    onClick={() => navigate("/dashboard")}
                >
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-home sidebar-nav-item-icon"></i>
                        <span>Dashboard</span>
                    </div>
                </div>

                <div 
                    className={`sidebar-nav-item ${location.pathname.startsWith("/investigation") ? "active" : ""}`}
                    onClick={() => navigate("/investigations")}
                >
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-search sidebar-nav-item-icon"></i>
                        <span>Investigations</span>
                    </div>
                </div>

                <div 
                    className={`sidebar-nav-item ${isCurrent("/history") ? "active" : ""}`}
                    onClick={() => navigate("/history")}
                >
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-history sidebar-nav-item-icon"></i>
                        <span>History</span>
                    </div>
                </div>

                <div 
                    className={`sidebar-nav-item ${isCurrent("/reports") ? "active" : ""}`}
                    onClick={() => navigate("/reports")}
                >
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-chart-bar sidebar-nav-item-icon"></i>
                        <span>Reports</span>
                    </div>
                </div>

                {/* Section: MANAGEMENT */}
                <div className="sidebar-section-label" style={{ marginTop: "0.75rem" }}>MANAGEMENT</div>
                <div 
                    className={`sidebar-nav-item ${isCurrent("/settings") ? "active" : ""}`}
                    onClick={() => navigate("/settings")}
                >
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-cog sidebar-nav-item-icon"></i>
                        <span>Settings</span>
                    </div>
                </div>

                {/* Section: FUTURE FEATURES */}
                <div className="sidebar-section-label" style={{ marginTop: "0.75rem" }}>FUTURE FEATURES</div>
                <div className="sidebar-nav-item disabled">
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-bell sidebar-nav-item-icon"></i>
                        <span>Notifications</span>
                    </div>
                    <span className="sidebar-nav-badge">3</span>
                </div>

                <div className="sidebar-nav-item disabled">
                    <div className="sidebar-nav-item-left">
                        <i className="pi pi-chart-line sidebar-nav-item-icon"></i>
                        <span>Live Monitoring</span>
                    </div>
                </div>
            </div>

            {/* Sidebar Footer Status */}
            <div className="sidebar-footer-card">
                <div className="sidebar-status-row" title={backendOnline ? "Backend API Gateway & Lambda Online" : "Backend Offline"}>
                    <span 
                        className="status-dot-green" 
                        style={{ backgroundColor: backendOnline ? "var(--success)" : "var(--danger)" }}
                    ></span>
                    <span>Backend {backendOnline ? "Online" : "Offline"}</span>
                </div>
                <div className="sidebar-status-row" title={telemetryStatus.text}>
                    <span 
                        className="status-dot-green" 
                        style={{ backgroundColor: telemetryStatus.dotColor }}
                    ></span>
                    <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis" style={{ maxWidth: "165px" }}>
                        {telemetryStatus.text}
                    </span>
                </div>
            </div>
        </aside>
    );
}