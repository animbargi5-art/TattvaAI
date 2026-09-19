import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "primereact/menu";
import { Badge } from "primereact/badge";
import { useState, useEffect, useCallback } from "react";
import telemetryService from "../../services/telemetryService";
import dashboardService from "../../services/dashboardService";

import "../../styles/layouts/sidebar.css";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeRoute, setActiveRoute] = useState(location.pathname);
    const [backendOnline, setBackendOnline] = useState(true);
    const [telemetryStatus, setTelemetryStatus] = useState({
        provider: "aws",
        name: "AWS Observability",
        connected: true,
        mode: "LIVE",
        text: "AWS Observability — LIVE",
        dotColor: "text-green-500"
    });

    // Check backend health and dynamic telemetry provider status
    const checkStatuses = useCallback(async () => {
        // 1. Check Backend Online
        try {
            await dashboardService.getBackendStatus();
            setBackendOnline(true);
        } catch {
            setBackendOnline(false);
        }

        // 2. Check Telemetry Status for active provider
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
                    dotColor: "text-yellow-500"
                });
            } else if (activeProv === "aws" || activeProv === "cloudwatch") {
                if (testRes.connected) {
                    setTelemetryStatus({
                        provider: "aws",
                        name: "AWS Observability",
                        connected: true,
                        mode: "LIVE",
                        text: "AWS Observability — LIVE",
                        dotColor: "text-green-500"
                    });
                } else {
                    setTelemetryStatus({
                        provider: "aws",
                        name: "AWS Observability",
                        connected: false,
                        mode: "LIVE",
                        text: "AWS Observability — NOT CONNECTED",
                        dotColor: "text-red-500"
                    });
                }
            } else if (activeProv === "signoz") {
                if (testRes.connected) {
                    setTelemetryStatus({
                        provider: "signoz",
                        name: "SigNoz",
                        connected: true,
                        mode: "LIVE",
                        text: "SigNoz — LIVE",
                        dotColor: "text-green-500"
                    });
                } else {
                    setTelemetryStatus({
                        provider: "signoz",
                        name: "SigNoz",
                        connected: false,
                        mode: "LIVE",
                        text: "SigNoz — NOT CONNECTED",
                        dotColor: "text-orange-500"
                    });
                }
            } else if (activeProv === "opentelemetry" || activeProv === "otlp") {
                if (testRes.connected) {
                    setTelemetryStatus({
                        provider: "opentelemetry",
                        name: "OpenTelemetry",
                        connected: true,
                        mode: "LIVE",
                        text: "OpenTelemetry — LIVE",
                        dotColor: "text-green-500"
                    });
                } else {
                    setTelemetryStatus({
                        provider: "opentelemetry",
                        name: "OpenTelemetry",
                        connected: false,
                        mode: "LIVE",
                        text: "OpenTelemetry — NOT CONNECTED",
                        dotColor: "text-orange-500"
                    });
                }
            } else {
                setTelemetryStatus({
                    provider: activeProv,
                    name: activeProv,
                    connected: !!testRes.connected,
                    mode: testRes.mode || "LIVE",
                    text: `${activeProv.toUpperCase()} — ${testRes.connected ? "LIVE" : "NOT CONNECTED"}`,
                    dotColor: testRes.connected ? "text-green-500" : "text-orange-500"
                });
            }
        } catch {
            setTelemetryStatus({
                provider: activeProv,
                name: "Telemetry",
                connected: false,
                mode: "UNKNOWN",
                text: "Telemetry — Status unavailable",
                dotColor: "text-gray-400"
            });
        }
    }, []);

    // Update active route when location changes
    useEffect(() => {
        setActiveRoute(location.pathname);
    }, [location.pathname]);

    // Poll status and listen for provider changes
    useEffect(() => {
        checkStatuses();
        const interval = setInterval(checkStatuses, 30000);
        const handleProviderChange = () => {
            checkStatuses();
        };
        window.addEventListener("tattvaai:provider-changed", handleProviderChange);
        return () => {
            clearInterval(interval);
            window.removeEventListener("tattvaai:provider-changed", handleProviderChange);
        };
    }, [checkStatuses]);

    const menuItems = [
        {
            label: 'Main',
            items: [
                {
                    label: 'Dashboard',
                    icon: 'pi pi-home',
                    command: () => navigate('/dashboard'),
                    className: activeRoute === '/dashboard' ? 'active-menu-item' : ''
                },
                {
                    label: 'Investigations',
                    icon: 'pi pi-search',
                    items: [
                        {
                            label: 'Active Investigation',
                            icon: 'pi pi-play',
                            command: () => navigate('/investigation/active'),
                            disabled: true // Enable when there's an active investigation
                        },
                        {
                            label: 'Start New',
                            icon: 'pi pi-plus',
                            command: () => navigate('/dashboard') // Redirect to dashboard to start
                        }
                    ]
                },
                {
                    label: 'History',
                    icon: 'pi pi-history',
                    command: () => navigate('/history'),
                    className: activeRoute === '/history' ? 'active-menu-item' : ''
                },
                {
                    label: 'Reports',
                    icon: 'pi pi-chart-bar',
                    command: () => navigate('/reports'),
                    className: activeRoute === '/reports' ? 'active-menu-item' : ''
                }
            ]
        },
        {
            separator: true
        },
        {
            label: 'Management',
            items: [
                {
                    label: 'Settings',
                    icon: 'pi pi-cog',
                    command: () => navigate('/settings'),
                    className: activeRoute === '/settings' ? 'active-menu-item' : ''
                }
            ]
        },
        {
            separator: true
        },
        {
            label: 'Future Features',
            items: [
                {
                    label: 'Notifications',
                    icon: 'pi pi-bell',
                    badge: '3', // Example notification count
                    command: () => navigate('/notifications'),
                    disabled: true,
                    template: (item, options) => (
                        <div className={options.className} onClick={options.onClick}>
                            <span className={options.iconClassName}></span>
                            <span className={options.labelClassName}>{item.label}</span>
                            {item.badge && (
                                <Badge
                                    value={item.badge}
                                    severity="danger"
                                    className="ml-auto"
                                />
                            )}
                        </div>
                    )
                },
                {
                    label: 'Live Monitoring',
                    icon: 'pi pi-eye',
                    command: () => navigate('/live-monitoring'),
                    disabled: true
                },
                {
                    label: 'Knowledge Graph',
                    icon: 'pi pi-sitemap',
                    command: () => navigate('/knowledge-graph'),
                    disabled: true
                },
                {
                    label: 'AI Assistant',
                    icon: 'pi pi-comments',
                    command: () => navigate('/ai-assistant'),
                    disabled: true
                }
            ]
        }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-section">
                    <i className="pi pi-bolt logo-icon"></i>
                    <h2 className="logo-text">TattvaAI</h2>
                </div>
                <p className="tagline">AI Investigation Platform</p>
            </div>

            <div className="sidebar-menu">
                <Menu
                    model={menuItems}
                    className="navigation-menu"
                />
            </div>

            <div className="sidebar-footer">
                <div className="status-section">
                    <div className="status-item" title={backendOnline ? "Backend API Gateway & Lambda Online" : "Backend Offline"}>
                        <i className={`pi pi-circle-fill ${backendOnline ? "text-green-500" : "text-red-500"}`}></i>
                        <span>Backend {backendOnline ? "Online" : "Offline"}</span>
                    </div>
                    <div className="status-item" title={telemetryStatus.text}>
                        <i className={`pi pi-circle-fill ${telemetryStatus.dotColor}`}></i>
                        <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis" style={{ maxWidth: '170px' }}>
                            {telemetryStatus.text}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}