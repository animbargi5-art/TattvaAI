import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import PrivateRoute from "../components/Auth/PrivateRoute";

import DashboardPage from "../pages/DashboardPage";
import HistoryPage from "../pages/HistoryPage";
import InvestigationPage from "../pages/InvestigationPage";
import SettingsPage from "../pages/SettingsPage";
import ReportsPage from "../pages/ReportPage";

import LandingPage from "../pages/LandingPage";
import PricingPage from "../pages/PricingPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

export default function AppRouter() {
    return (
        <Routes>
            {/* Public Routes — Open to all visitors */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes — Guarded by PrivateRoute and wrapped in MainLayout */}
            <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/report" element={<Navigate to="/reports" replace />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/investigations" element={<InvestigationPage />} />
                    <Route path="/investigation" element={<Navigate to="/investigations" replace />} />
                    <Route path="/investigation/:id" element={<InvestigationPage />} />
                </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}