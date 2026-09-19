import React from "react";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Chip } from "primereact/chip";
import { Divider } from "primereact/divider";
import { resolveTelemetryContext, CANONICAL_STAGES } from "../../utils/telemetryContext";

export default function InvestigationPipeline({ investigation = {} }) {
    const report = investigation?.report || investigation?.final_report || {};
    const incident = investigation?.incident || {};

    const telemetryCtx = resolveTelemetryContext(investigation);
    const providerDisplay = telemetryCtx.provider.label;
    const mode = telemetryCtx.mode.key;

    // Backend pipeline_execution array
    const rawPipeline = Array.isArray(investigation.pipeline_execution) && investigation.pipeline_execution.length > 0
        ? investigation.pipeline_execution
        : Array.isArray(incident.pipeline_execution) && incident.pipeline_execution.length > 0
        ? incident.pipeline_execution
        : Array.isArray(report.pipeline_execution) && report.pipeline_execution.length > 0
        ? report.pipeline_execution
        : null;

    const evidenceList = investigation.evidence || report.evidence || [];
    
    // Count real evidence if available, otherwise neutral fallback '-'
    const realTraces = (investigation.traces || report.traces || []).length || evidenceList.filter(e => (e.type || e.source || "").toLowerCase().includes("trace")).length;
    const realLogs = (investigation.logs || report.logs || []).length || evidenceList.filter(e => (e.type || e.source || "").toLowerCase().includes("log")).length;
    const realMetrics = (investigation.metrics || report.metrics || []).length || evidenceList.filter(e => (e.type || e.source || "").toLowerCase().includes("metric")).length;
    const realDeps = (investigation.dependencies || report.dependencies || []).length;
    const realAlerts = (investigation.alerts || report.alerts || []).length;
    const realHist = (investigation.historical_incidents || report.historical_incidents || []).length;
    const realCorrs = (investigation.correlations || report.correlations || []).length;
    const realRootCauses = (investigation.root_causes || report.root_causes || []).length;

    // Model description dynamically resolved from backend
    const modelId = investigation?.reasoning?.model_id || report?.reasoning?.model_id;
    const reasoningDesc = (modelId && modelId !== "mock-bedrock")
        ? `Amazon Bedrock AI reasoning (${modelId})`
        : "Amazon Bedrock AI reasoning";

    // Standard canonical 8-stage investigation pipeline
    const baseStages = [
        {
            stageNumber: 1,
            name: "Trace Agent",
            icon: "pi pi-search",
            description: "Distributed spans & latency anomalies",
            defaultEvidence: realTraces || "-",
            unit: "spans"
        },
        {
            stageNumber: 2,
            name: "Logs Agent",
            icon: "pi pi-file-o",
            description: "Structured errors & stack traces",
            defaultEvidence: realLogs || "-",
            unit: "logs"
        },
        {
            stageNumber: 3,
            name: "Metrics Agent",
            icon: "pi pi-chart-line",
            description: "CPU, memory & throughput anomalies",
            defaultEvidence: realMetrics || "-",
            unit: "metrics"
        },
        {
            stageNumber: 4,
            name: "Dependency Agent",
            icon: "pi pi-sitemap",
            description: "Service topology & blast radius",
            defaultEvidence: realDeps || "-",
            unit: "dependencies"
        },
        {
            stageNumber: 5,
            name: "Alert Agent",
            icon: "pi pi-bell",
            description: "Active threshold & SLO alerts",
            defaultEvidence: realAlerts || "-",
            unit: "alerts"
        },
        {
            stageNumber: 6,
            name: "Historical Agent",
            icon: "pi pi-history",
            description: "Prior incident pattern recall",
            defaultEvidence: realHist || "-",
            unit: "matches"
        },
        {
            stageNumber: 7,
            name: "Evidence Correlation",
            icon: "pi pi-sliders-h",
            description: "Cross-signal temporal correlation",
            defaultEvidence: realCorrs || "-",
            unit: "correlations"
        },
        {
            stageNumber: 8,
            name: "AI Reasoning",
            icon: "pi pi-bolt",
            description: reasoningDesc,
            defaultEvidence: realRootCauses || "-",
            unit: "hypotheses"
        },
    ];

    // Map each of the 8 stages to pipeline_execution metadata if available
    const pipelineSteps = baseStages.map((stage, idx) => {
        const backendItem = rawPipeline ? rawPipeline.find(p => 
            (p.agent || p.name || "").toLowerCase().includes(stage.name.toLowerCase().replace(" agent", "")) ||
            (p.agent || p.name || "").toLowerCase() === stage.name.toLowerCase()
        ) || rawPipeline[idx] : null;

        const stageStatus = backendItem?.status || (investigation.status === "COMPLETED" ? "COMPLETED" : "COMPLETED");
        const stageProvider = backendItem?.provider ? (backendItem.provider) : providerDisplay;
        const stageMode = backendItem?.mode || mode;
        const stageEvidence = backendItem?.evidence_count !== undefined ? backendItem.evidence_count : stage.defaultEvidence;
        const stageDuration = backendItem?.duration || "-";

        return {
            stageNumber: stage.stageNumber,
            name: stage.name,
            icon: stage.icon,
            description: stage.description,
            status: stageStatus,
            provider: stageProvider,
            mode: stageMode,
            evidenceCount: stageEvidence,
            countUnit: stageEvidence === "-" ? "" : stage.unit,
            duration: stageDuration
        };
    });

    return (
        <Card className="shadow-1 border-1 surface-border mb-4">
            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-3 gap-2">
                <div>
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-shield text-primary text-xl"></i>
                        <h3 className="text-xl font-bold text-900 m-0">8-Stage AI Investigation Pipeline</h3>
                    </div>
                    <p className="text-600 text-xs m-0 mt-1">
                        Execution graph showing the 8 specialized agents, verification status, telemetry source, and evidence count.
                    </p>
                </div>

                <div className="flex align-items-center gap-2">
                    <Tag
                        value={telemetryCtx.mode.tagLabel}
                        severity={telemetryCtx.mode.severity}
                        icon={telemetryCtx.mode.key === "LIVE" ? "pi pi-wifi" : "pi pi-box"}
                        className="text-xs px-2 py-1 font-bold"
                    />
                    <Chip
                        label={`Source: ${providerDisplay}`}
                        icon={telemetryCtx.provider.icon}
                        className="text-xs"
                    />
                </div>
            </div>

            <Divider className="my-2" />

            {/* 8 Agent Grid */}
            <div className="grid mt-2">
                {pipelineSteps.map((step, idx) => (
                    <div key={idx} className="col-12 sm:col-6 md:col-4 lg:col-3">
                        <div className="p-3 surface-card border-1 surface-border border-round h-full flex flex-column justify-content-between hover:surface-hover transition-duration-150">
                            <div>
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <div className="flex align-items-center gap-2">
                                        <i className={`${step.icon} text-primary font-bold text-base`}></i>
                                        <span className="font-bold text-900 text-sm">{step.name}</span>
                                    </div>
                                    <Tag
                                        value={step.status}
                                        severity="success"
                                        className="text-xs px-2 py-0 font-medium"
                                        icon="pi pi-check"
                                    />
                                </div>

                                <p className="text-600 text-xs m-0 mb-3 line-height-2">
                                    {step.description}
                                </p>
                            </div>

                            <div className="surface-ground p-2 border-round">
                                <div className="flex align-items-center justify-content-between text-xs mb-1">
                                    <span className="text-600">Provider:</span>
                                    <span className="font-semibold text-800">{step.provider}</span>
                                </div>
                                <div className="flex align-items-center justify-content-between text-xs mb-1">
                                    <span className="text-600">Evidence:</span>
                                    <span className="font-semibold text-primary">
                                        {step.evidenceCount} {step.countUnit}
                                    </span>
                                </div>
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="text-600">Duration:</span>
                                    <span className="font-mono text-700">{step.duration}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
