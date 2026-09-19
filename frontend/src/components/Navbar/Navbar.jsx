import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "primereact/menu";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const notificationsRef = useRef(null);
    const userMenuRef = useRef(null);

    const notifications = [
        { id: 1, type: "info", message: "Investigation #INC-D17F8E62 completed", timestamp: "2 min ago" },
        { id: 2, type: "warning", message: "High latency detected on payment-service", timestamp: "5 min ago" },
        { id: 3, type: "success", message: "AWS CloudWatch & X-Ray sync active", timestamp: "10 min ago" }
    ];

    const displayName = user?.full_name ? user.full_name.split(" ")[0] : "Atharv";
    const initial = displayName.charAt(0).toUpperCase();

    const userMenuItems = [
        {
            label: user?.full_name || "Engineer Profile",
            items: [
                {
                    label: user?.email || "Authenticated Operator",
                    icon: "pi pi-id-card",
                    disabled: true,
                },
                {
                    label: "Platform Settings",
                    icon: "pi pi-cog",
                    command: () => {
                        navigate("/settings");
                    }
                },
                {
                    separator: true
                },
                {
                    label: "Logout",
                    icon: "pi pi-sign-out",
                    className: "text-red-500",
                    command: () => {
                        logout();
                        navigate("/login");
                    }
                }
            ]
        }
    ];

    return (
        <header className="top-header">
            <div className="top-header-right">
                {/* Notification Bell */}
                <button 
                    className="header-icon-btn" 
                    onClick={(e) => notificationsRef.current.toggle(e)}
                    title="Notifications"
                >
                    <i className="pi pi-bell"></i>
                    <span className="header-badge-count">3</span>
                </button>

                {/* Theme Toggle (Moon icon) */}
                <button 
                    className="header-icon-btn" 
                    title="Toggle Theme"
                    disabled
                >
                    <i className="pi pi-moon"></i>
                </button>

                {/* Authenticated User Avatar */}
                <button 
                    className="user-profile-btn" 
                    onClick={(e) => userMenuRef.current.toggle(e)}
                >
                    <div className="user-avatar-circle">{initial}</div>
                    <span className="user-name-text">{displayName}</span>
                    <i className="pi pi-chevron-down" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}></i>
                </button>
            </div>

            {/* Notifications Overlay Panel */}
            <OverlayPanel ref={notificationsRef} style={{ width: "320px" }}>
                <div style={{ padding: "0.5rem" }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Notifications</span>
                        <span className="status-pill status-pill-info" style={{ fontSize: "10px", padding: "1px 6px" }}>3 unread</span>
                    </div>
                    <div className="flex flex-column gap-2">
                        {notifications.map(n => (
                            <div key={n.id} style={{ fontSize: "0.8rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{n.message}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{n.timestamp}</div>
                            </div>
                        ))}
                    </div>
                    <Divider className="my-2" />
                    <Button 
                        label="View all notifications" 
                        className="p-button-text p-button-sm w-full"
                        style={{ fontSize: "0.75rem" }}
                        disabled
                    />
                </div>
            </OverlayPanel>

            {/* User Dropdown Menu */}
            <Menu 
                model={userMenuItems} 
                popup 
                ref={userMenuRef} 
            />
        </header>
    );
}