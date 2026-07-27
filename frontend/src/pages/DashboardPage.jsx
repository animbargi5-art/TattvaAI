import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Message } from "primereact/message";

import investigationService from "../services/investigationService";
import dashboardService from "../services/dashboardService";

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

    // Fetch dashboard statistics
    const { 
        data: dashboardStats, 
        isLoading: statsLoading, 
        error: statsError 
    } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dashboardService.getDashboardStats,
        refetchInterval: 30000 // Refresh every 30 seconds
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
        refetchInterval: 10000 // Refresh every 10 seconds
    });

    // Fetch investigation status
    const { 
        data: investigationStatus, 
        isLoading: statusLoading 
    } = useQuery({
        queryKey: ['investigation-status'],
        queryFn: dashboardService.getInvestigationStatus,
        refetchInterval: 5000 // Refresh every 5 seconds
    });

    // Start investigation mutation
    const startInvestigationMutation = useMutation({
        mutationFn: (params) => investigationService.startInvestigation(params),
        onMutate: () => {
            setIsInvestigationRunning(true);
        },
        onSuccess: (data) => {
            // Refresh related queries
            queryClient.invalidateQueries(['recent-investigations']);
            queryClient.invalidateQueries(['investigation-status']);
            queryClient.invalidateQueries(['dashboard-stats']);
            
            // Navigate to investigation page if ID is returned
            const investigationId = data?.investigation_id ?? data?.incident_id;
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
        startInvestigationMutation.mutate({ service_name: "gateway" });
    };

    const refreshDashboard = () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recent-investigations'] });
        queryClient.invalidateQueries({ queryKey: ['investigation-status'] });
    };

    if (statsLoading && investigationsLoading && statusLoading) {
        return (
            <div className="dashboard-page">
                <DashboardLoading />
            </div>
        );
    }

    return (
        <div className="dashboard-page p-4">
            {/* Page Header */}
            <div className="dashboard-header mb-4">
                <div className="flex align-items-center justify-content-between">
                    <div>
                        <h1 className="text-3xl font-bold text-900 m-0">TattvaAI Dashboard</h1>
                        <p className="text-600 m-0 mt-1">AI-powered incident investigation workspace</p>
                    </div>
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        className="p-button-outlined"
                        onClick={refreshDashboard}
                        loading={statsLoading || investigationsLoading}
                    />
                </div>
            </div>

            {/* Investigation Control Block */}
            <Card className="investigation-control-block mb-4 border-2 border-primary-200" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <div className="text-white">
                    <div className="flex align-items-center justify-content-between">
                        <div>
                            <div className="flex align-items-center mb-2">
                                <i className="pi pi-cog text-2xl mr-2"></i>
                                <h2 className="text-2xl font-bold m-0">Investigation Control</h2>
                            </div>
                            <p className="text-100 m-0 text-lg">
                                Launch AI-powered autonomous incident investigation with 6 specialized agents
                            </p>
                            <div className="flex align-items-center mt-2 text-sm">
                                <i className="pi pi-clock mr-1"></i>
                                <span>Average investigation time: 28 seconds</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <Button
                                label={isInvestigationRunning ? "Investigation Running..." : "Start New Investigation"}
                                icon={isInvestigationRunning ? "pi pi-spin pi-spinner" : "pi pi-play"}
                                onClick={handleStartInvestigation}
                                disabled={isInvestigationRunning || investigationStatus?.status === 'running'}
                                loading={startInvestigationMutation.isPending}
                                className="p-button-success p-button-lg"
                                style={{minWidth: '200px'}}
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
                    <Card className="investigation-status-block h-full border-2 border-blue-200">
                        <div className="flex align-items-center mb-3">
                            <i className="pi pi-info-circle text-blue-600 text-2xl mr-3"></i>
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
                    <Card className="investigation-progress-block h-full border-2 border-green-200">
                        <div className="flex align-items-center mb-3">
                            <i className="pi pi-chart-line text-green-600 text-2xl mr-3"></i>
                            <h3 className="text-xl font-semibold m-0 text-900">AI Investigation Progress</h3>
                        </div>
                        <InvestigationProgress 
                            status={investigationStatus}
                            running={isInvestigationRunning || investigationStatus?.status === 'running'}
                        />
                    </Card>
                </div>
            </div>

            {/* Statistics Block */}
            <Card className="statistics-block mb-4 border-2 border-orange-200">
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
            <Card className="recent-investigations-block border-2 border-purple-200">
                <div className="flex align-items-center justify-content-between mb-3">
                    <div className="flex align-items-center">
                        <i className="pi pi-history text-purple-600 text-2xl mr-3"></i>
                        <h3 className="text-xl font-semibold m-0 text-900">Recent Investigations</h3>
                    </div>
                    <Button 
                        label="View All History" 
                        icon="pi pi-external-link"
                        className="p-button-outlined p-button-purple"
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
                        <p className="text-500 mb-3">Start your first AI investigation to see results here</p>
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
        </div>
    );
}