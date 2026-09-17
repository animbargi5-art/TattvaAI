import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import DashboardPage from "../pages/DashboardPage";
import HistoryPage from "../pages/HistoryPage";
import InvestigationPage from "../pages/InvestigationPage";
import SettingsPage from "../pages/SettingsPage";
import ReportsPage from "../pages/ReportPage";

import LandingPage from "../pages/LandingPage";
import PricingPage from "../pages/PricingPage";

export default function AppRouter() {
    return (
        <Routes>
            {/* Standalone Landing & Pricing Pages without sidebar wrapper */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* Dashboard & App Pages wrapped in MainLayout */}
            <Route
                path="*"
                element={
                    <MainLayout>
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/history" element={<HistoryPage />} />
                            <Route path="/reports" element={<ReportsPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/investigation/:id" element={<InvestigationPage />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </MainLayout>
                }
            />
        </Routes>
    );
}