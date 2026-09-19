import { useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import { setToastRef } from "../api/interceptors.js";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

import "../styles/layouts/main-layout.css";

export default function MainLayout({ children }) {
    const toastRef = useRef(null);
    const location = useLocation();

    // Set global toast reference for API error handling
    useEffect(() => {
        setToastRef(toastRef);
    }, []);

    const renderBreadcrumb = () => {
        const path = location.pathname;
        let items = [{ label: "Settings" }];
        if (path === "/dashboard") {
            items = [{ label: "Dashboard" }];
        } else if (path === "/history") {
            items = [{ label: "History" }];
        } else if (path === "/reports") {
            items = [{ label: "Reports" }];
        } else if (path.startsWith("/investigation/")) {
            const id = path.split("/")[2] || "";
            items = [
                { label: "Investigations" },
                { label: id }
            ];
        } else if (path === "/settings") {
            items = [{ label: "Settings" }];
        }

        return (
            <div className="breadcrumb-nav">
                <i className="pi pi-home breadcrumb-home-icon"></i>
                {items.map((it, idx) => (
                    <span key={idx} className="flex align-items-center">
                        <span className="breadcrumb-divider">/</span>
                        <span className="breadcrumb-text">{it.label}</span>
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="layout-wrapper">
            <Sidebar />
            
            <div className="layout-main">
                <Navbar />
                
                <main className="main-content">
                    {renderBreadcrumb()}
                    {children || <Outlet />}
                </main>
            </div>

            {/* Global components for notifications and confirmations */}
            <Toast 
                ref={toastRef} 
                position="top-right" 
                className="custom-toast"
            />
            <ConfirmDialog />
        </div>
    );
}