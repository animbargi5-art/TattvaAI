import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { confirmDialog } from "primereact/confirmdialog";

import investigationService from "../services/investigationService";

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

export default function InvestigationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch investigation data
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
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Delete investigation mutation
    const deleteInvestigationMutation = useMutation({
        mutationFn: () => investigationService.deleteInvestigation(id),
        onSuccess: () => {
            // Invalidate related queries
            queryClient.invalidateQueries(['recent-investigations']);
            queryClient.invalidateQueries(['dashboard-stats']);
            
            // Navigate back to dashboard
            navigate('/dashboard');
        }
    });

    // Refresh investigation mutation
    const refreshInvestigationMutation = useMutation({
        mutationFn: () => investigationService.refreshInvestigation(id),
        onSuccess: () => {
            // Refetch the investigation data
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

    // Loading skeleton
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
                            label="Back to Dashboard" 
                            icon="pi pi-arrow-left"
                            severity="secondary"
                            onClick={() => navigate('/dashboard')}
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
                            label="Back to Dashboard" 
                            icon="pi pi-home"
                            onClick={() => navigate('/dashboard')}
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

            {/* Multi-Agent Investigation Pipeline */}
            <InvestigationPipeline investigation={investigation} />

            {/* Executive Summary */}
            <IncidentSummary investigation={investigation} />

            {/* Main Content Grid */}
            <div className="grid">
                {/* Evidence Panel */}
                <div className="col-12 lg:col-6">
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

                {/* AI Reasoning Panel */}
                <div className="col-12 lg:col-6">
                    <ReasoningPanel investigation={investigation} />
                </div>

                {/* Investigation Graph */}
                <div className="col-12">
                    <InvestigationGraph investigation={investigation} />
                </div>

                {/* Human Review & Decision Panel */}
                <div className="col-12">
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

                {/* Action Panel */}
                <div className="col-12">
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