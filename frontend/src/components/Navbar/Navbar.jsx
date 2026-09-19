import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menubar } from "primereact/menubar";
import { Badge } from "primereact/badge";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { Chip } from "primereact/chip";
import { OverlayPanel } from "primereact/overlaypanel";
import { Divider } from "primereact/divider";
import dashboardService from "../../services/dashboardService";
import telemetryService from "../../services/telemetryService";

import "../../styles/layouts/navbar.css";

export default function Navbar() {
    const location = useLocation();
    const [backendStatus, setBackendStatus] = useState('connected');
    const [telemetryInfo, setTelemetryInfo] = useState({
        name: 'AWS Observability',
        status: 'connected',
        mode: 'LIVE'
    });
    const [currentInvestigation, setCurrentInvestigation] = useState(null);
    const [notifications] = useState([
        { id: 1, type: 'info', message: 'Investigation #INV-001 completed', timestamp: '2 min ago' },
        { id: 2, type: 'warning', message: 'High CPU usage detected', timestamp: '5 min ago' },
        { id: 3, type: 'success', message: 'System health check passed', timestamp: '10 min ago' }
    ]);
    
    const notificationsRef = useRef(null);
    const userMenuRef = useRef(null);
    const statusRef = useRef(null);

    // Generate breadcrumb items based on current route
    const getBreadcrumbItems = () => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const items = [];
        
        pathSegments.forEach((segment, index) => {
            const path = '/' + pathSegments.slice(0, index + 1).join('/');
            const label = segment.charAt(0).toUpperCase() + segment.slice(1);
            
            items.push({
                label: label === 'Investigation' && pathSegments[index + 1] ? 
                       `Investigation #${pathSegments[index + 1]}` : label,
                url: path
            });
        });

        return items;
    };

    const breadcrumbItems = getBreadcrumbItems();
    const breadcrumbHome = { icon: 'pi pi-home', url: '/dashboard' };

    // User menu items
    const userMenuItems = [
        {
            label: 'Profile',
            icon: 'pi pi-user',
            command: () => {
                // Navigate to profile (future feature)
            }
        },
        {
            label: 'Settings',
            icon: 'pi pi-cog',
            command: () => {
                // Navigate to settings
                window.location.href = '/settings';
            }
        },
        {
            separator: true
        },
        {
            label: 'Logout',
            icon: 'pi pi-sign-out',
            command: () => {
                // Handle logout (future feature)
            }
        }
    ];

    // Check system status on component mount
    useEffect(() => {
        const checkSystemStatus = async () => {
            try {
                await dashboardService.getBackendStatus();
                setBackendStatus('connected');
            } catch (error) {
                setBackendStatus('disconnected');
            }

            const activeProv = telemetryService.getActiveProvider() || 'aws';
            try {
                const res = await telemetryService.testProviderConnection({ provider: activeProv });
                const nameMap = {
                    aws: 'AWS Observability',
                    signoz: 'SigNoz',
                    opentelemetry: 'OpenTelemetry',
                    mock: 'Mock / Demo'
                };
                setTelemetryInfo({
                    name: nameMap[activeProv] || activeProv.toUpperCase(),
                    status: res.connected ? 'connected' : 'disconnected',
                    mode: res.mode || (activeProv === 'mock' ? 'DEMO' : 'LIVE')
                });
            } catch (error) {
                setTelemetryInfo(prev => ({
                    ...prev,
                    status: 'disconnected'
                }));
            }
        };

        checkSystemStatus();
        
        // Set up periodic status checks
        const statusInterval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
        const handleProviderChange = () => checkSystemStatus();
        window.addEventListener('tattvaai:provider-changed', handleProviderChange);
        
        return () => {
            clearInterval(statusInterval);
            window.removeEventListener('tattvaai:provider-changed', handleProviderChange);
        };
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
                return 'pi pi-check-circle text-green-500';
            case 'disconnected':
                return 'pi pi-times-circle text-red-500';
            case 'connecting':
                return 'pi pi-spin pi-spinner text-yellow-500';
            default:
                return 'pi pi-question-circle text-gray-500';
        }
    };

    const getStatusText = (service, status) => {
        switch (status) {
            case 'connected':
                return `${service} Online`;
            case 'disconnected':
                return `${service} Offline`;
            case 'connecting':
                return `${service} Connecting...`;
            default:
                return `${service} Unknown`;
        }
    };

    // Logo and brand section
    const logoTemplate = () => (
        <div className="navbar-brand">
            <i className="pi pi-bolt brand-icon"></i>
            <span className="brand-text">TattvaAI</span>
        </div>
    );

    // Right side actions
    const actionsTemplate = () => (
        <div className="navbar-actions">
            {/* Current Investigation Indicator */}
            {currentInvestigation && (
                <div className="current-investigation">
                    <Chip 
                        label={`Investigation ${currentInvestigation.id}`}
                        icon="pi pi-play"
                        className="investigation-chip"
                        removable={false}
                    />
                </div>
            )}

            {/* System Status */}
            <Button
                icon="pi pi-server"
                className="p-button-text status-button"
                onClick={(e) => statusRef.current.toggle(e)}
                tooltip="System Status"
                tooltipOptions={{ position: 'bottom' }}
            />

            {/* Notifications */}
            <div className="notification-wrapper">
                <Button
                    icon="pi pi-bell"
                    className="p-button-text notification-button"
                    onClick={(e) => notificationsRef.current.toggle(e)}
                    tooltip="Notifications"
                    tooltipOptions={{ position: 'bottom' }}
                />
                {notifications.length > 0 && (
                    <Badge 
                        value={notifications.length} 
                        severity="danger" 
                        className="notification-badge"
                    />
                )}
            </div>

            {/* Theme Toggle (Future Feature) */}
            <Button
                icon="pi pi-moon"
                className="p-button-text theme-button"
                tooltip="Toggle Theme (Coming Soon)"
                tooltipOptions={{ position: 'bottom' }}
                disabled
            />

            {/* User Menu */}
            <Button
                className="p-button-text user-button"
                onClick={(e) => userMenuRef.current.toggle(e)}
                tooltip="User Menu"
                tooltipOptions={{ position: 'bottom' }}
            >
                <Avatar 
                    icon="pi pi-user" 
                    shape="circle" 
                    className="user-avatar"
                />
            </Button>
        </div>
    );

    return (
        <>
            <header className="navbar">
                <Menubar
                    start={logoTemplate}
                    end={actionsTemplate}
                    className="main-menubar"
                />
                
                {/* Breadcrumb Navigation - Temporarily replaced due to PrimeReact import issue */}
                <div className="breadcrumb-section">
                    <div className="simple-breadcrumb">
                        {breadcrumbItems.length > 0 ? (
                            <>
                                <i className="pi pi-home"></i>
                                {breadcrumbItems.map((item, index) => (
                                    <span key={index}>
                                        <span className="breadcrumb-separator"> / </span>
                                        <span className="breadcrumb-item">{item.label}</span>
                                    </span>
                                ))}
                            </>
                        ) : (
                            <>
                                <i className="pi pi-home"></i>
                                <span className="breadcrumb-separator"> / </span>
                                <span className="breadcrumb-item">Dashboard</span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* System Status Overlay */}
            <OverlayPanel ref={statusRef} className="status-panel">
                <div className="status-content">
                    <h5>System Status</h5>
                    <div className="status-items">
                        <div className="status-item">
                            <i className={getStatusIcon(backendStatus)}></i>
                            <span>{getStatusText('Backend API', backendStatus)}</span>
                        </div>
                        <div className="status-item">
                            <i className={getStatusIcon(telemetryInfo.status)}></i>
                            <span>{getStatusText(telemetryInfo.name, telemetryInfo.status)}</span>
                        </div>
                    </div>
                    <Divider />
                    <small className="text-600">Last updated: {new Date().toLocaleTimeString()}</small>
                </div>
            </OverlayPanel>

            {/* Notifications Overlay */}
            <OverlayPanel ref={notificationsRef} className="notifications-panel">
                <div className="notifications-content">
                    <div className="notifications-header">
                        <h5>Notifications</h5>
                        <Button 
                            icon="pi pi-times" 
                            className="p-button-text p-button-sm"
                            onClick={() => notificationsRef.current.hide()}
                        />
                    </div>
                    <div className="notifications-list">
                        {notifications.map(notification => (
                            <div key={notification.id} className="notification-item">
                                <i className={`pi ${
                                    notification.type === 'info' ? 'pi-info-circle text-blue-500' :
                                    notification.type === 'warning' ? 'pi-exclamation-triangle text-yellow-500' :
                                    'pi-check-circle text-green-500'
                                }`}></i>
                                <div className="notification-content">
                                    <p>{notification.message}</p>
                                    <small className="text-600">{notification.timestamp}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Divider />
                    <Button 
                        label="View All Notifications" 
                        icon="pi pi-external-link"
                        className="p-button-text p-button-sm"
                        onClick={() => {
                            // Navigate to notifications page
                            window.location.href = '/notifications';
                        }}
                    />
                </div>
            </OverlayPanel>

            {/* User Menu Overlay */}
            <Menu 
                model={userMenuItems} 
                popup 
                ref={userMenuRef} 
                className="user-menu"
            />
        </>
    );
}