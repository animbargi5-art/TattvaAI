import { useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import { setToastRef } from "../api/interceptors.js";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

import "../styles/layouts/main-layout.css";

export default function MainLayout({ children }) {
    const toastRef = useRef(null);

    // Set global toast reference for API error handling
    useEffect(() => {
        setToastRef(toastRef);
    }, []);

    return (
        <div className="layout-wrapper">
            <Sidebar />
            
            <div className="layout-main">
                <Navbar />
                
                <main className="main-content">
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