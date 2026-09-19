import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Message } from "primereact/message";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Chip } from "primereact/chip";
import { Divider } from "primereact/divider";

import investigationService from "../services/investigationService";
import dashboardService from "../services/dashboardService";
import telemetryService from "../services/telemetryService";

import InvestigationList from "../components/Dashboard/InvestigationList";
import StatisticsCards from "../components/Dashboard/StatisticsCards";
import InvestigationProgress from "../components/Dashboard/InvestigationProgress";
import InvestigationStatus from "../components/Dashboard/InvestigationStatus";

// Import dashboard styles
import "../styles/dashboard.css";

function DashboardLoading() {
    return (
        <div className="grid">
            <div className="col-12"><Skeleton height="3rem" className="mb-3" /></div>
            {[...Array(4)].map((_, index) => (
                <div key={index} className="col-12 md:col-6 lg:col-3"><Skeleton height="7rem" /></div>
            ))}
        </div>
    );
}

function DashboardError({ error }) {
    return <Message severity="error" text={`Unable to load dashboard data: ${error.message}`} className="mb-3" />;
}

export default function DashboardPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isInvestigationRunning, setIsInvestigationRunning] = useState(false);
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [serviceName, setServiceName] = useState("api-gateway");
    const [telemetrySource, setTelemetrySource] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [environment, setEnvironment] = useState("Production");
    const [timeWindow, setTimeWindow] = useState("15m");

    // Modal provider connection test state
    const [modalTestStatus, setModalTestStatus] = useState(null);
    const [modalTesting, setModalTesting] = useState(false);

    const providerOptions = [
        { label: "AWS Observability (CloudWatch & X-Ray via IAM)", value: "aws" },
        { label: "SigNoz (Distributed Traces, Metrics & Logs)", value: "signoz" },
        { label: "OpenTelemetry-Compatible Backend (Query API)", value: "opentelemetry" },
        { label: "Mock / Demo (Deterministic Simulation)", value: "mock" }
    ];

    const environmentOptions = [
        { label: "Production", value: "Production" },
        { label: "Staging", value: "Staging" },
        { label: "Development", value: "Development" },
        { label: "Demo Sandbox", value: "Demo" }
    ];

    const timeWindowOptions = [
        { label: "Last 15 minutes (15m)", value: "15m" },
        { label: "Last 1 hour (1h)", value: "1h" },
        { label: "Last 6 hours (6h)", value: "6h" },
        { label: "Last 24 hours (24h)", value: "24h" }
    ];

    // Fetch dashboard statistics
    const { 
        data: dashboardStats, 
        isLoading: statsLoading, 
        error: statsError 
    } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => dashboardService.getDashboardStats(),
        refetchInterval: 30000
    });

    // Fetch recent investigations
    const { 
        data: investigations, 
        isLoading: investigationsLoading, 
        error: investigationsError 
    } = useQuery({
        queryKey: ['recent-investigations'],
        queryFn: () => dashboardService.getRecentInvestigations(10),
        initialData: [],
        refetchInterval: 10000
    });

    // Fetch investigation status
    const { 
        data: investigationStatus, 
        isLoading: statusLoading 
    } = useQuery({
        queryKey: ['investigation-status'],
        queryFn: () => dashboardService.getInvestigationStatus(),
        refetchInterval: 5000
    });

    // Fetch active telemetry source status directly from backend
    const {
        data: activeTelemetryStatus,
        isLoading: telemetryLoading,
        refetch: refetchTelemetry
    } = useQuery({
        queryKey: ['active-telemetry-status'],
        queryFn: async () => {
            const activeProv = telemetryService.getActiveProvider() || "aws";
            try {
                const res = await telemetryService.testProviderConnection({ provider: activeProv });
                const nameMap = {
                    aws: "AWS Observability",
                    signoz: "SigNoz",
                    opentelemetry: "OpenTelemetry Backend",
                    mock: "Mock / Demo"
                };
                return {
                    id: activeProv,
                    name: nameMap[activeProv] || activeProv.toUpperCase(),
                    mode: res.mode || (activeProv === "mock" ? "DEMO" : "LIVE"),
                    connected: !!res.connected,
                    message: res.message
                };
            } catch {
                return null;
            }
        },
        refetchInterval: 30000
    });

    // Check backend health
    const { data: backendHealth } = useQuery({
        queryKey: ['backend-health-check'],
        queryFn: async () => {
            try {
                return await dashboardService.getBackendStatus();
            } catch {
                return null;
            }
        },
        refetchInterval: 30000
    });

    // Test selected provider whenever launch modal opens or provider changes
    useEffect(() => {
        if (!isLaunchModalOpen) return;
        let isCancelled = false;

        const testSelected = async () => {
            setModalTesting(true);
            try {
                const res = await telemetryService.testProviderConnection({ provider: telemetrySource });
                if (!isCancelled) {
                    setModalTestStatus(res);
                }
            } catch {
                if (!isCancelled) {
                    setModalTestStatus({
                        connected: false,
                        provider: telemetrySource,
                        message: "Unable to verify provider status with backend.",
                        mode: telemetrySource === "mock" ? "DEMO" : "LIVE"
                    });
                }
            } finally {
                if (!isCancelled) setModalTesting(false);
            }
        };

        testSelected();
        return () => { isCancelled = true; };
    }, [telemetrySource, isLaunchModalOpen]);

    // Listen for provider changes across tabs or pages
    useEffect(() => {
        const handleProviderChange = () => {
            refetchTelemetry();
            setTelemetrySource(telemetryService.getActiveProvider() || "aws");
        };
        window.addEventListener("tattvaai:provider-changed", handleProviderChange);
        return () => window.removeEventListener("tattvaai:provider-changed", handleProviderChange);
    }, [refetchTelemetry]);

    // Start investigation mutation
    const startInvestigationMutation = useMutation({
        mutationFn: (params) => investigationService.startInvestigation(params),
        onMutate: () => {
            setIsInvestigationRunning(true);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['recent-investigations']);
            queryClient.invalidateQueries(['investigation-status']);
            queryClient.invalidateQueries(['dashboard-stats']);
            
            const investigationId = data?.investigation_id ?? data?.incident_id ?? data?.id;
            if (investigationId) {
                navigate(`/investigation/${investigationId}`);
            }
        },
        onError: (error) => {
            console.error('Failed to start investigation:', error);
        },
        onSettled: () => {
            setIsInvestigationRunning(false);
        }
    });

    const handleStartInvestigation = () => {
        setTelemetrySource(telemetryService.getActiveProvider() || "aws");
        setIsLaunchModalOpen(true);
    };

    const handleConfirmLaunch = () => {
        setIsLaunchModalOpen(false);
        startInvestigationMutation.mutate({
            service_name: serviceName || "api-gateway",
            telemetry_source: telemetrySource,
            environment: environment,
            time_window: timeWindow
        });
    };

    const refreshDashboard = () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recent-investigations'] });
        queryClient.invalidateQueries({ queryKey: ['investigation-status'] });
        refetchTelemetry();
    };

    if (statsLoading && investigationsLoading && statusLoading) {
        return (
            <div className="dashboard-page p-4">
                <DashboardLoading />
            </div>
        );
    }

    return (
        <div className="dashboard-page p-4">
            {/* Page Header */}
            <div className="dashboard-header mb-4">
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-900 m-0">TattvaAI Dashboard</h1>
                        <p className="text-600 m-0 mt-1">
                            Autonomous multi-signal incident investigation & AI root-cause reasoning
                        </p>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-outlined"
                            onClick={refreshDashboard}
                            loading={statsLoading || investigationsLoading}
                        />
                    </div>
                </div>
            </div>

            {/* Compact Telemetry & Backend Status Section */}
            <div className="grid mb-4">
                <div className="col-12">
                    <Card className="surface-card border-1 surface-border shadow-1 p-3">
                        <div className="flex flex-column lg:flex-row lg:align-items-center justify-content-between gap-3">
                            <div className="flex align-items-center gap-3">
                                <div className="flex align-items-center justify-content-center surface-100 border-circle w-3rem h-3rem">
                                    <i className="pi pi-compass text-primary text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs text-500 font-semibold uppercase tracking-wider">
                                        Telemetry Source
                                    </div>
                                    <div className="text-900 font-bold text-lg flex align-items-center gap-2">
                                        <span>
                                            {telemetryLoading ? "Loading..." : (activeTelemetryStatus?.name || "Status unavailable")}
                                        </span>
                                        {activeTelemetryStatus && (
                                            <Tag
                                                value={activeTelemetryStatus.mode}
                                                severity={activeTelemetryStatus.mode === 'LIVE' ? 'success' : 'warning'}
                                                className="text-xs font-bold"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap align-items-center gap-4">
                                <div>
                                    <div className="text-xs text-500 font-semibold uppercase tracking-wider">Mode</div>
                                    <div className="font-bold text-sm text-800">
                                        {telemetryLoading ? (
                                            <span className="text-500">Checking...</span>
                                        ) : activeTelemetryStatus ? (
                                            activeTelemetryStatus.mode === 'LIVE' ? (
                                                <span className="text-green-600">● LIVE</span>
                                            ) : (
                                                <span className="text-yellow-600">● DEMO</span>
                                            )
                                        ) : (
                                            <span className="text-500">Status unavailable</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-500 font-semibold uppercase tracking-wider">Provider Status</div>
                                    <div className="font-bold text-sm">
                                        {telemetryLoading ? (
                                            <span className="text-500">Verifying...</span>
                                        ) : activeTelemetryStatus ? (
                                            activeTelemetryStatus.connected ? (
                                                <span className="text-green-600">● Verified Live</span>
                                            ) : activeTelemetryStatus.id === 'signoz' ? (
                                                <span className="text-orange-600">● Not Verified / Not Connected</span>
                                            ) : (
                                                <span className="text-orange-600">● Not Connected</span>
                                            )
                                        ) : (
                                            <span className="text-500">Status unavailable</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-500 font-semibold uppercase tracking-wider">Backend</div>
                                    <div className="font-bold text-sm">
                                        {backendHealth ? (
                                            <span className="text-green-600">● Online (AWS Lambda)</span>
                                        ) : (
                                            <span className="text-red-500">● Offline</span>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    label="Configure Providers"
                                    icon="pi pi-cog"
                                    size="small"
                                    outlined
                                    severity="secondary"
                                    onClick={() => navigate('/settings')}
                                    className="p-button-sm"
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Investigation Control Block */}
            <Card className="investigation-control-block mb-4 border-2 border-primary-200" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <div className="text-white">
                    <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3">
                        <div>
                            <div className="flex align-items-center mb-2">
                                <i className="pi pi-shield text-2xl mr-2"></i>
                                <h2 className="text-2xl font-bold m-0">Investigation Control</h2>
                            </div>
                            <p className="text-100 m-0 text-lg">
                                Launch AI-powered autonomous incident investigation with our 8-stage AI investigation pipeline
                            </p>
                            <div className="flex align-items-center mt-2 text-sm text-200">
                                <i className="pi pi-clock mr-1"></i>
                                <span>Multi-agent correlation & Bedrock reasoning · Real-time human review</span>
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <Button
                                label={isInvestigationRunning ? "Investigation Running..." : "Start New Investigation"}
                                icon={isInvestigationRunning ? "pi pi-spin pi-spinner" : "pi pi-play"}
                                onClick={handleStartInvestigation}
                                disabled={isInvestigationRunning || investigationStatus?.status === 'running'}
                                loading={startInvestigationMutation.isPending}
                                className="p-button-success p-button-lg shadow-2"
                                style={{minWidth: '220px'}}
                            />
                            {investigationStatus?.status === 'running' && (
                                <div className="mt-2 text-100 text-sm">
                                    <i className="pi pi-spin pi-spinner mr-1"></i>
                                    Investigation in progress...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Status and Progress Blocks */}
            <div className="grid mb-4">
                <div className="col-12 lg:col-6">
                    <Card className="investigation-status-block h-full border-1 surface-border shadow-1">
                        <div className="flex align-items-center mb-3">
                            <i className="pi pi-info-circle text-primary text-2xl mr-3"></i>
                            <h3 className="text-xl font-semibold m-0 text-900">Investigation Status</h3>
                        </div>
                        <InvestigationStatus 
                            status={investigationStatus}
                            loading={statusLoading}
                            running={isInvestigationRunning || investigationStatus?.status === 'running'}
                        />
                    </Card>
                </div>
                <div className="col-12 lg:col-6">
                    <Card className="investigation-progress-block h-full border-1 surface-border shadow-1">
                        <div className="flex align-items-center mb-3">
                            <i className="pi pi-chart-line text-green-600 text-2xl mr-3"></i>
                            <h3 className="text-xl font-semibold m-0 text-900">8-Stage Pipeline Workflow</h3>
                        </div>
                        <InvestigationProgress 
                            status={investigationStatus}
                            running={isInvestigationRunning || investigationStatus?.status === 'running'}
                        />
                    </Card>
                </div>
            </div>

            {/* Statistics Block */}
            <Card className="statistics-block mb-4 border-1 surface-border shadow-1">
                <div className="flex align-items-center mb-3">
                    <i className="pi pi-chart-bar text-orange-600 text-2xl mr-3"></i>
                    <h3 className="text-xl font-semibold m-0 text-900">Investigation Analytics</h3>
                </div>
                {statsError ? (
                    <DashboardError error={statsError} />
                ) : (
                    <StatisticsCards 
                        stats={dashboardStats} 
                        investigations={investigations} 
                        loading={statsLoading}
                    />
                )}
            </Card>

            {/* Recent Investigations Block */}
            <Card className="recent-investigations-block border-1 surface-border shadow-1">
                <div className="flex align-items-center justify-content-between mb-3">
                    <div className="flex align-items-center">
                        <i className="pi pi-history text-purple-600 text-2xl mr-3"></i>
                        <h3 className="text-xl font-semibold m-0 text-900">Recent Investigations</h3>
                    </div>
                    <Button 
                        label="View All History" 
                        icon="pi pi-external-link"
                        className="p-button-outlined p-button-secondary"
                        onClick={() => navigate('/history')}
                    />
                </div>

                {investigationsError ? (
                    <DashboardError error={investigationsError} />
                ) : investigationsLoading ? (
                    <div className="grid">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="col-12 md:col-6 lg:col-4">
                                <Skeleton height="8rem" className="border-round" />
                            </div>
                        ))}
                    </div>
                ) : investigations && investigations.length > 0 ? (
                    <InvestigationList investigations={investigations} />
                ) : (
                    <div className="text-center py-6">
                        <i className="pi pi-search text-4xl text-400 mb-3"></i>
                        <h4 className="text-600 mb-2">No investigations found</h4>
                        <p className="text-500 mb-3">Start your first AI incident investigation to isolate root causes</p>
                        <Button 
                            label="Start Investigation" 
                            icon="pi pi-play"
                            className="p-button-primary"
                            onClick={handleStartInvestigation}
                            disabled={isInvestigationRunning}
                        />
                    </div>
                )}
            </Card>

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
                style={{ width: '90vw', maxWidth: '640px' }}
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
                        Select your telemetry observability source, target service, environment, and analysis window. TattvaAI's 8-stage pipeline will correlate traces, logs, metrics, alerts, and dependencies to synthesize root causes.
                    </p>

                    <Divider className="my-1" />

                    {/* Telemetry Provider Field */}
                    <div className="field m-0">
                        <label className="font-semibold text-sm mb-1 block">Telemetry Provider</label>
                        <Dropdown
                            value={telemetrySource}
                            options={providerOptions}
                            onChange={(e) => setTelemetrySource(e.value)}
                            optionLabel="label"
                            className="w-full"
                        />
                        <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mt-2 gap-2">
                            <span className="text-xs text-600">
                                {telemetrySource === 'aws' ? 'CloudWatch metrics, logs & X-Ray distributed traces via IAM.' :
                                 telemetrySource === 'signoz' ? 'SigNoz distributed trace, metric, and log query API.' :
                                 telemetrySource === 'opentelemetry' ? 'OpenTelemetry-compatible query API endpoint.' :
                                 'Deterministic synthetic microservice telemetry for offline demo & evaluation.'}
                            </span>
                            {modalTesting ? (
                                <Tag value="Checking..." severity="info" className="text-xs font-bold" />
                            ) : telemetrySource === 'mock' ? (
                                <Tag value="● Ready DEMO" severity="warning" className="text-xs font-bold white-space-nowrap" />
                            ) : telemetrySource === 'aws' && modalTestStatus?.connected ? (
                                <Tag value="● Connected LIVE TELEMETRY" severity="success" className="text-xs font-bold white-space-nowrap" />
                            ) : telemetrySource === 'signoz' && !modalTestStatus?.connected ? (
                                <Tag value="● SigNoz Not Connected" severity="danger" className="text-xs font-bold white-space-nowrap" />
                            ) : modalTestStatus?.connected ? (
                                <Tag value="● Connected LIVE TELEMETRY" severity="success" className="text-xs font-bold white-space-nowrap" />
                            ) : (
                                <Tag value="● Not Connected" severity="danger" className="text-xs font-bold white-space-nowrap" />
                            )}
                        </div>
                    </div>

                    {/* Target Service Field */}
                    <div className="field m-0">
                        <label className="font-semibold text-sm mb-1 block">Target Service</label>
                        <InputText
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            placeholder="e.g. payment-service, gateway, order-service, inventory-service"
                            className="w-full"
                        />
                        <small className="text-500 text-xs block mt-1">
                            Name of the microservice to query and isolate anomalies for.
                        </small>
                    </div>

                    {/* Environment and Time Window */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <div className="field m-0">
                                <label className="font-semibold text-sm mb-1 block">Environment</label>
                                <Dropdown
                                    value={environment}
                                    options={environmentOptions}
                                    onChange={(e) => setEnvironment(e.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <div className="field m-0">
                                <label className="font-semibold text-sm mb-1 block">Time Window</label>
                                <Dropdown
                                    value={timeWindow}
                                    options={timeWindowOptions}
                                    onChange={(e) => setTimeWindow(e.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}