import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Divider } from "primereact/divider";
import { confirmDialog } from "primereact/confirmdialog";

import investigationService from "../services/investigationService";
import dashboardService from "../services/dashboardService";
import telemetryService from "../services/telemetryService";

import InvestigationHeader from "../components/Investigation/InvestigationHeader";
import InvestigationPipeline from "../components/Investigation/InvestigationPipeline";
import RootCausePanel from "../components/Investigation/RootCausePanel";
import EvidencePanel from "../components/Investigation/EvidencePanel";
import TimelinePanel from "../components/Investigation/TimelinePanel";
import RecommendationPanel from "../components/Investigation/RecommendationPanel";
import ActionPanel from "../components/Investigation/ActionPanel";
import IncidentSummary from "../components/Investigation/IncidentSummary";
import CorrelationPanel from "../components/Investigation/CorrelationPanel";
import ReasoningPanel from "../components/Investigation/ReasoningPanel";
import InvestigationGraph from "../components/Investigation/InvestigationGraph";
import HumanReviewPanel from "../components/Investigation/HumanReviewPanel";
import InvestigationList from "../components/Dashboard/InvestigationList";

const SECTIONS = [
    { id: "sec-summary", label: "Summary", icon: "pi pi-info-circle" },
    { id: "sec-pipeline", label: "Pipeline", icon: "pi pi-shield" },
    { id: "sec-evidence", label: "Evidence", icon: "pi pi-list" },
    { id: "sec-reasoning", label: "Reasoning", icon: "pi pi-bolt" },
    { id: "sec-review", label: "Human Review", icon: "pi pi-user-edit" },
    { id: "sec-actions", label: "Actions & Export", icon: "pi pi-download" },
];

export default function InvestigationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Contextual sticky nav state
    const [activeSection, setActiveSection] = useState("sec-summary");

    // Launch Modal state for direct /investigations route
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [telemetrySource, setTelemetrySource] = useState("aws");
    const [serviceName, setServiceName] = useState("api-gateway");
    const [environment, setEnvironment] = useState("production");
    const [timeWindow, setTimeWindow] = useState("15m");

    const providerOptions = [
        { label: "AWS Observability (CloudWatch + X-Ray) — LIVE", value: "aws" },
        { label: "Mock / Demo Provider — SYNTHETIC DEMO", value: "mock" },
        { label: "SigNoz Observability — LIVE", value: "signoz" },
        { label: "OpenTelemetry Backend — LIVE", value: "opentelemetry" }
    ];

    const serviceOptions = [
        { label: "api-gateway (Production Core)", value: "api-gateway" },
        { label: "payment-service", value: "payment-service" },
        { label: "auth-service", value: "auth-service" },
        { label: "order-service", value: "order-service" }
    ];

    const environmentOptions = [
        { label: "Production (us-east-1)", value: "production" },
        { label: "Staging (us-east-1)", value: "staging" }
    ];

    const timeWindowOptions = [
        { label: "Last 15 minutes", value: "15m" },
        { label: "Last 30 minutes", value: "30m" },
        { label: "Last 1 hour", value: "1h" },
        { label: "Last 4 hours", value: "4h" }
    ];

    // Query for recent investigations when viewing /investigations landing
    const { 
        data: recentInvestigations = [], 
        isLoading: investigationsLoading,
        refetch: refetchRecent
    } = useQuery({
        queryKey: ['recent-investigations'],
        queryFn: () => dashboardService.getRecentInvestigations(15),
        enabled: !id,
        staleTime: 30000
    });

    // Start investigation mutation
    const startInvestigationMutation = useMutation({
        mutationFn: (params) => investigationService.startInvestigation(params),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['recent-investigations']);
            queryClient.invalidateQueries(['dashboard-stats']);
            
            const newId = data?.investigation_id ?? data?.incident_id ?? data?.id;
            setIsLaunchModalOpen(false);
            if (newId) {
                navigate(`/investigation/${newId}`);
            }
        },
        onError: (err) => {
            console.error("Failed to start investigation:", err);
        }
    });

    // Fetch investigation data when ID is present
    const { 
        data: investigation, 
        isLoading, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['investigation', id],
        queryFn: () => investigationService.getInvestigationById(id),
        enabled: !!id,
        retry: 2,
        staleTime: 5 * 60 * 1000
    });

    // Delete investigation mutation
    const deleteInvestigationMutation = useMutation({
        mutationFn: () => investigationService.deleteInvestigation(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['recent-investigations']);
            queryClient.invalidateQueries(['dashboard-stats']);
            navigate('/investigations');
        }
    });

    // Refresh investigation mutation
    const refreshInvestigationMutation = useMutation({
        mutationFn: () => investigationService.refreshInvestigation(id),
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries(['investigation', id]);
        }
    });

    const handleDelete = () => {
        confirmDialog({
            message: 'Are you sure you want to delete this investigation? This action cannot be undone.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => deleteInvestigationMutation.mutate(),
            reject: () => {},
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel'
        });
    };

    const handleRefresh = () => {
        refreshInvestigationMutation.mutate();
    };

    const handleConfirmLaunch = () => {
        startInvestigationMutation.mutate({
            service_name: serviceName || "api-gateway",
            telemetry_source: telemetrySource,
            environment: environment,
            time_window: timeWindow
        });
    };

    const scrollToSection = (sectionId) => {
        setActiveSection(sectionId);
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Track scroll position to update active section in sticky nav
    useEffect(() => {
        if (!id) return;
        const handleScroll = () => {
            const scrollPos = window.scrollY + 140;
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const sec = SECTIONS[i];
                const el = document.getElementById(sec.id);
                if (el && el.offsetTop <= scrollPos) {
                    setActiveSection(sec.id);
                    break;
                }
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [id]);

    // Loading skeleton for detail view
    const LoadingSkeleton = () => (
        <div className="investigation-page">
            <Card className="mb-4">
                <Skeleton height="4rem" className="mb-3" />
                <div className="flex gap-3">
                    <Skeleton height="2rem" width="8rem" />
                    <Skeleton height="2rem" width="6rem" />
                    <Skeleton height="2rem" width="10rem" />
                </div>
            </Card>
            
            <div className="grid">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="col-12 md:col-6">
                        <Skeleton height="15rem" className="mb-3" />
                    </div>
                ))}
            </div>
        </div>
    );

    // =========================================================================
    // IDLE / LANDING STATE FOR /investigations ROUTE (When no ID in URL)
    // =========================================================================
    if (!id) {
        return (
            <div className="investigation-page">
                {/* Header Row */}
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h1 className="page-title m-0">Investigations</h1>
                        <p className="page-subtitle m-0 mt-1">
                            Start a new investigation to analyze production telemetry.
                        </p>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Button
                            label="Start Investigation"
                            icon="pi pi-bolt"
                            className="btn-primary"
                            onClick={() => {
                                setTelemetrySource(telemetryService.getActiveProvider() || "aws");
                                setIsLaunchModalOpen(true);
                            }}
                            loading={startInvestigationMutation.isPending}
                        />
                        <Button
                            icon="pi pi-refresh"
                            className="p-button-outlined"
                            onClick={() => refetchRecent()}
                            loading={investigationsLoading}
                            tooltip="Refresh Investigations"
                        />
                    </div>
                </div>

                {/* Content: Recent investigations or Clean Empty State */}
                {recentInvestigations && recentInvestigations.length > 0 ? (
                    <Card className="surface-card border-1 surface-border shadow-1 mb-4">
                        <div className="flex align-items-center justify-content-between mb-3">
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-search text-primary"></i>
                                <h3 className="text-base font-bold text-900 m-0">All Investigations</h3>
                            </div>
                            <span className="text-xs text-500 font-mono">{recentInvestigations.length} Available</span>
                        </div>
                        <InvestigationList investigations={recentInvestigations} />
                    </Card>
                ) : (
                    <Card className="surface-card border-1 surface-border shadow-1 text-center py-6">
                        <i className="pi pi-search text-400" style={{ fontSize: "3rem" }}></i>
                        <h3 className="text-800 mt-3 mb-1">No Investigations Found</h3>
                        <p className="text-600 mb-4 text-sm">
                            Start a new investigation to analyze production telemetry across traces, logs, and metrics.
                        </p>
                        <Button
                            label="Start Investigation"
                            icon="pi pi-bolt"
                            className="btn-primary"
                            onClick={() => {
                                setTelemetrySource(telemetryService.getActiveProvider() || "aws");
                                setIsLaunchModalOpen(true);
                            }}
                        />
                    </Card>
                )}

                {/* Start Investigation Dialog */}
                <Dialog
                    header={
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-play text-primary text-xl"></i>
                            <span className="font-bold text-lg">Launch AI Incident Investigation</span>
                        </div>
                    }
                    visible={isLaunchModalOpen}
                    onHide={() => setIsLaunchModalOpen(false)}
                    style={{ width: "90vw", maxWidth: "580px" }}
                    contentStyle={{ maxHeight: "calc(85vh - 120px)", overflowY: "auto", padding: "1rem 1.25rem" }}
                    footer={
                        <div className="flex justify-content-end gap-2 pt-2">
                            <Button
                                label="Cancel"
                                icon="pi pi-times"
                                severity="secondary"
                                outlined
                                onClick={() => setIsLaunchModalOpen(false)}
                            />
                            <Button
                                label="Launch Investigation"
                                icon="pi pi-bolt"
                                severity="primary"
                                onClick={handleConfirmLaunch}
                                loading={startInvestigationMutation.isPending}
                            />
                        </div>
                    }
                >
                    <div className="flex flex-column gap-3 pt-2">
                        <p className="text-600 text-sm m-0 line-height-3">
                            Select your telemetry observability source, target service, and analysis window. TattvaAI's 8-stage pipeline will correlate traces, logs, metrics, alerts, and topology to isolate root causes.
                        </p>

                        <Divider className="my-1" />

                        <div className="field m-0">
                            <label className="font-semibold text-sm mb-1 block">Telemetry Provider</label>
                            <Dropdown
                                value={telemetrySource}
                                options={providerOptions}
                                onChange={(e) => setTelemetrySource(e.value)}
                                optionLabel="label"
                                className="w-full text-sm"
                            />
                        </div>

                        <div className="field m-0">
                            <label className="font-semibold text-sm mb-1 block">Target Service</label>
                            <Dropdown
                                value={serviceName}
                                options={serviceOptions}
                                onChange={(e) => setServiceName(e.value)}
                                optionLabel="label"
                                className="w-full text-sm"
                            />
                        </div>

                        <div className="grid">
                            <div className="col-12 sm:col-6">
                                <div className="field m-0">
                                    <label className="font-semibold text-sm mb-1 block">Environment</label>
                                    <Dropdown
                                        value={environment}
                                        options={environmentOptions}
                                        onChange={(e) => setEnvironment(e.value)}
                                        optionLabel="label"
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>
                            <div className="col-12 sm:col-6">
                                <div className="field m-0">
                                    <label className="font-semibold text-sm mb-1 block">Analysis Window</label>
                                    <Dropdown
                                        value={timeWindow}
                                        options={timeWindowOptions}
                                        onChange={(e) => setTimeWindow(e.value)}
                                        optionLabel="label"
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </div>
        );
    }

    // =========================================================================
    // DETAIL VIEW FOR /investigation/:id
    // =========================================================================

    // Error state
    if (error) {
        return (
            <div className="investigation-page">
                <Card>
                    <Message 
                        severity="error" 
                        text={`Failed to load investigation: ${error.message}`}
                        className="w-full"
                    />
                    <div className="flex gap-2 mt-3">
                        <Button 
                            label="Try Again" 
                            icon="pi pi-refresh"
                            onClick={() => refetch()}
                        />
                        <Button 
                            label="Back to Investigations" 
                            icon="pi pi-arrow-left"
                            severity="secondary"
                            onClick={() => navigate('/investigations')}
                        />
                    </div>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    // Investigation not found
    if (!investigation || investigation.status === 'NOT_FOUND') {
        return (
            <div className="investigation-page">
                <Card>
                    <div className="text-center py-6">
                        <i className="pi pi-search text-400" style={{ fontSize: '3rem' }}></i>
                        <h2 className="text-400 mt-3">Investigation Not Found</h2>
                        <p className="text-600 mb-4">
                            The investigation with ID "{id}" could not be found.
                        </p>
                        <Button 
                            label="Back to Investigations" 
                            icon="pi pi-home"
                            onClick={() => navigate('/investigations')}
                        />
                    </div>
                </Card>
            </div>
        );
    }

    const resolvedId = id || investigation.investigation_id || investigation.id || investigation.incident_id;

    return (
        <div className="investigation-page">
            {/* Investigation Header */}
            <InvestigationHeader investigation={investigation} />

            {/* Contextual Sticky Sub-Navbar */}
            <div className="investigation-sticky-nav">
                {SECTIONS.map((sec) => (
                    <button
                        key={sec.id}
                        type="button"
                        className={`sticky-nav-item ${activeSection === sec.id ? "active" : ""}`}
                        onClick={() => scrollToSection(sec.id)}
                    >
                        <i className={sec.icon} style={{ fontSize: "0.85rem" }}></i>
                        <span>{sec.label}</span>
                    </button>
                ))}
            </div>

            {/* Section 1: Executive Summary */}
            <div id="sec-summary" style={{ scrollMarginTop: "120px" }}>
                <IncidentSummary investigation={investigation} />
            </div>

            {/* Section 2: Multi-Agent Investigation Pipeline */}
            <div id="sec-pipeline" style={{ scrollMarginTop: "120px" }}>
                <InvestigationPipeline investigation={investigation} />
            </div>

            {/* Main Content Grid */}
            <div className="grid">
                {/* Section 3: Evidence Panel */}
                <div id="sec-evidence" className="col-12 lg:col-6" style={{ scrollMarginTop: "120px" }}>
                    <EvidencePanel investigation={investigation} />
                </div>

                {/* Timeline Panel */}
                <div className="col-12 lg:col-6">
                    <TimelinePanel investigation={investigation} />
                </div>

                {/* Correlation Panel */}
                <div className="col-12 lg:col-6">
                    <CorrelationPanel investigation={investigation} />
                </div>

                {/* Section 4: AI Reasoning Panel */}
                <div id="sec-reasoning" className="col-12 lg:col-6" style={{ scrollMarginTop: "120px" }}>
                    <ReasoningPanel investigation={investigation} />
                </div>

                {/* Investigation Graph */}
                <div className="col-12">
                    <InvestigationGraph investigation={investigation} />
                </div>

                {/* Section 5: Human Review & Decision Panel */}
                <div id="sec-review" className="col-12" style={{ scrollMarginTop: "120px" }}>
                    <HumanReviewPanel
                        investigation={investigation}
                        onReviewSubmitted={() => {
                            refetch();
                            queryClient.invalidateQueries(['investigation', id]);
                        }}
                    />
                </div>

                {/* Root Cause Panel */}
                <div className="col-12 lg:col-6">
                    <RootCausePanel investigation={investigation} />
                </div>

                {/* Recommendations Panel */}
                <div className="col-12 lg:col-6">
                    <RecommendationPanel investigation={investigation} />
                </div>

                {/* Section 6: Action & Export Panel */}
                <div id="sec-actions" className="col-12" style={{ scrollMarginTop: "120px" }}>
                    <ActionPanel
                        investigationId={resolvedId}
                        onRefresh={handleRefresh}
                        onDelete={handleDelete}
                        refreshLoading={refreshInvestigationMutation.isPending}
                        deleteLoading={deleteInvestigationMutation.isPending}
                    />
                </div>
            </div>
        </div>
    );
}