import React, { useState } from "react";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { TabView, TabPanel } from "primereact/tabview";
import { DataView } from "primereact/dataview";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";
import { Message } from "primereact/message";
import { Accordion, AccordionTab } from "primereact/accordion";
import { resolveTelemetryContext, getSignalLabel } from "../../utils/telemetryContext";
import EvidenceProvenanceDialog from "./EvidenceProvenanceDialog";
import "../../styles/components/investigation/evidence-panel.css";

export default function EvidencePanel({ investigation }) {
    const [selectedProvenance, setSelectedProvenance] = useState(null);
    const [provenanceDialogOpen, setProvenanceDialogOpen] = useState(false);

    const rawEvidence = investigation?.report?.evidence || investigation?.final_report?.evidence || investigation?.evidence || [];

    // Normalize string-formatted evidence if present (e.g. serialized python repr)
    const evidence = rawEvidence.map((item, i) => {
        if (typeof item === "string") {
            try {
                return JSON.parse(item);
            } catch {
                const parsed = {
                    summary: item,
                    title: "Telemetry Evidence",
                    type: "trace",
                    evidence_id: `ev-${i + 1}`
                };
                const matchSummary = item.match(/summary=['"]([^'"]+)['"]/);
                if (matchSummary) parsed.summary = matchSummary[1];
                const matchType = item.match(/type=['"]([^'"]+)['"]/);
                if (matchType) parsed.type = matchType[1];
                const matchSeverity = item.match(/severity=['"]([^'"]+)['"]/);
                if (matchSeverity) parsed.severity = matchSeverity[1];
                const matchConfidence = item.match(/confidence=([0-9]+)/);
                if (matchConfidence) parsed.confidence = parseInt(matchConfidence[1], 10);
                const matchTraceId = item.match(/trace_id=['"]([^'"]+)['"]/);
                if (matchTraceId) parsed.evidence_id = matchTraceId[1];
                const matchService = item.match(/service_name=['"]([^'"]+)['"]/);
                if (matchService) parsed.service_name = matchService[1];
                return parsed;
            }
        }
        return item;
    });

    const getSeverityInfo = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return { severity: 'danger', color: 'text-red-600' };
            case 'HIGH':
                return { severity: 'warning', color: 'text-orange-600' };
            case 'MEDIUM':
                return { severity: 'info', color: 'text-blue-600' };
            case 'LOW':
                return { severity: 'success', color: 'text-green-600' };
            default:
                return { severity: 'secondary', color: 'text-gray-600' };
        }
    };

    const getEvidenceIcon = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes('trace') || t.includes('span')) return 'pi pi-search';
        if (t.includes('log')) return 'pi pi-file-o';
        if (t.includes('metric')) return 'pi pi-chart-line';
        if (t.includes('alert') || t.includes('alarm')) return 'pi pi-bell';
        if (t.includes('dep')) return 'pi pi-sitemap';
        if (t.includes('hist')) return 'pi pi-history';
        return 'pi pi-info-circle';
    };

    const getCategory = (item) => {
        if (item.category && ["Performance", "Application", "Infrastructure"].includes(item.category)) {
            return item.category;
        }
        const raw = (item.category || item.type || item.source || "").toLowerCase();
        if (raw.includes("trace") || raw.includes("metric") || raw.includes("latency") || raw.includes("perf")) {
            return "Performance";
        }
        if (raw.includes("log") || raw.includes("error") || raw.includes("exception") || raw.includes("app")) {
            return "Application";
        }
        if (raw.includes("dep") || raw.includes("alert") || raw.includes("alarm") || raw.includes("infra") || raw.includes("host") || raw.includes("network")) {
            return "Infrastructure";
        }
        return "Application";
    };

    // Group evidence by category
    const groupedEvidence = evidence.reduce((groups, item) => {
        const category = getCategory(item);
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
        return groups;
    }, {});

    const handleProvenanceClick = (item, telemetryCtx, signalLabel) => {
        const isMock = telemetryCtx.provider.key === "mock" || telemetryCtx.provider.key === "demo" || telemetryCtx.mode.key === "DEMO";
        const service = item.service_name || telemetryCtx.serviceName || "api-gateway";
        const region = "us-east-1";
        const rawType = (item.type || item.source || "").toLowerCase();

        let specificProvider = telemetryCtx.provider.label;
        if (!isMock) {
            if (rawType.includes("trace")) specificProvider = "AWS X-Ray";
            else if (rawType.includes("log") || rawType.includes("metric") || rawType.includes("alert")) specificProvider = "Amazon CloudWatch";
        }

        const traceId = item.trace_id || item.trace?.trace_id || item.raw?.trace_id || (item.evidence_id?.startsWith("1-") ? item.evidence_id : null);
        const logGroup = item.log_group || item.raw?.log_group || (rawType.includes("log") ? "/aws/lambda/TattvaAI-Backend" : null);

        let sourceUrl = null;
        if (!isMock && traceId && traceId.startsWith("1-")) {
            sourceUrl = `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=${region}#xray:traces/${traceId}`;
        } else if (!isMock && logGroup && logGroup.startsWith("/aws/")) {
            sourceUrl = `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroup))}`;
        }

        let acquisitionMethod = "";
        if (isMock) {
            acquisitionMethod = "Generated through TattvaAI's deterministic offline synthetic telemetry engine for payments degradation demonstration.";
        } else if (rawType.includes("trace")) {
            acquisitionMethod = "Retrieved directly from AWS X-Ray get_trace_summaries() API via backend IAM execution role.";
        } else if (rawType.includes("log")) {
            acquisitionMethod = "Retrieved from Amazon CloudWatch Logs filter_log_events() API via backend IAM execution role.";
        } else if (rawType.includes("metric")) {
            acquisitionMethod = "Retrieved from Amazon CloudWatch get_metric_data() API via backend IAM execution role.";
        } else {
            acquisitionMethod = `Retrieved securely via ${specificProvider} backend API integration.`;
        }

        setSelectedProvenance({
            provider: specificProvider,
            providerKey: telemetryCtx.provider.key,
            mode: isMock ? "DEMO" : "LIVE",
            signalType: signalLabel,
            sourceId: traceId || logGroup || item.evidence_id || item.id,
            timeRange: item.timestamp ? new Date(item.timestamp).toLocaleString() : (investigation.time_window || "Last 15 minutes"),
            service,
            region,
            acquisitionMethod,
            sourceUrl,
            isMock,
            description: item.summary || item.title
        });
        setProvenanceDialogOpen(true);
    };

    const evidenceTemplate = (item, index) => {
        const severityInfo = getSeverityInfo(item.severity);
        const telemetryCtx = resolveTelemetryContext(investigation, item);
        const signalLabel = getSignalLabel(item, telemetryCtx.provider.key);

        return (
            <Card className="evidence-card mb-3 surface-card border-1 surface-border shadow-1" key={index}>
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-2 gap-2">
                    <div className="flex align-items-center gap-2">
                        <i className={`${getEvidenceIcon(item.type)} text-primary`}
                           style={{ fontSize: '1.1rem' }}></i>
                        <h4 className="m-0 text-900 font-semibold text-sm">{signalLabel}</h4>
                        <Tag
                            value={item.severity || "MEDIUM"}
                            severity={severityInfo.severity}
                            className="font-semibold text-xs px-2 py-0"
                        />
                    </div>
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            className="btn-provenance-tag"
                            onClick={() => handleProvenanceClick(item, telemetryCtx, signalLabel)}
                            title="Inspect evidence provenance and source origin"
                        >
                            <i className={telemetryCtx.provider.icon}></i>
                            <span>{telemetryCtx.provider.label}</span>
                            <i className="pi pi-compass text-xs"></i>
                        </button>
                        <Tag
                            value={telemetryCtx.mode.label}
                            severity={telemetryCtx.mode.severity}
                            className="text-xs font-bold px-2 py-0"
                        />
                        <Badge
                            value={`${item.confidence ?? 80}% Conf.`}
                            severity="info"
                        />
                    </div>
                </div>

                <div className="mb-2">
                    <p className="text-700 line-height-3 m-0 text-sm">
                        {item.summary || item.message || item.title || "No summary available"}
                    </p>
                </div>

                <div className="grid pt-1">
                    <div className="col-12 sm:col-6 md:col-4">
                        <div className="field m-0">
                            <label className="text-500 font-medium text-xs">Target Service</label>
                            <div className="mt-1">
                                <Chip
                                    label={item.service_name || telemetryCtx.serviceName || 'core-service'}
                                    icon="pi pi-server"
                                    className="text-xs font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {item.timestamp && (
                        <div className="col-12 sm:col-6 md:col-4">
                            <div className="field m-0">
                                <label className="text-500 font-medium text-xs">Timestamp</label>
                                <div className="mt-1 flex align-items-center gap-2">
                                    <i className="pi pi-clock text-500 text-xs"></i>
                                    <span className="text-700 text-xs font-mono">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(item.evidence_id || item.id || item.trace?.trace_id || item.trace_id) && (
                        <div className="col-12 sm:col-6 md:col-4">
                            <div className="field m-0">
                                <label className="text-500 font-medium text-xs">Signal / Entity ID</label>
                                <div className="mt-1">
                                    <span className="font-mono text-xs text-800 surface-ground px-2 py-1 border-round block overflow-hidden text-overflow-ellipsis">
                                        {item.evidence_id || item.id || item.trace?.trace_id || item.trace_id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Trace Details if available */}
                {(item.trace || item.raw?.duration_ms || item.operation) && (
                    <Accordion className="mt-2">
                        <AccordionTab header={<span className="text-xs font-medium text-600">Signal Diagnostics</span>}>
                            <div className="grid text-xs">
                                <div className="col-12 md:col-6">
                                    <span className="text-500 font-medium block">Operation</span>
                                    <span className="text-800 font-mono">{item.operation || item.raw?.operation_name || 'N/A'}</span>
                                </div>
                                <div className="col-12 md:col-6">
                                    <span className="text-500 font-medium block">Status Code</span>
                                    <span className="text-800 font-semibold">{item.trace?.status || item.raw?.status_code || '200'}</span>
                                </div>
                                <div className="col-12 md:col-6">
                                    <span className="text-500 font-medium block">Duration</span>
                                    <span className="text-800 font-mono">
                                        {item.trace?.duration_ms ? `${item.trace.duration_ms} ms` : item.raw?.duration_ms ? `${item.raw.duration_ms} ms` : 'N/A'}
                                    </span>
                                </div>
                                {(item.trace_id || item.trace?.trace_id || item.raw?.trace_id) && (
                                    <div className="col-12">
                                        <span className="text-500 font-medium block">Trace ID</span>
                                        <span className="text-800 font-mono">
                                            {item.trace_id || item.trace?.trace_id || item.raw?.trace_id}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </AccordionTab>
                    </Accordion>
                )}
            </Card>
        );
    };

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-list text-700"></i>
                <span className="font-semibold text-base">Investigation Evidence</span>
            </div>
            <Badge value={evidence.length} severity="info" />
        </div>
    );

    return (
        <Card header={headerTemplate} className="evidence-panel">
            <TabView className="evidence-tabs">
                <TabPanel header={`Performance (${groupedEvidence["Performance"]?.length || 0})`}>
                    {(groupedEvidence["Performance"]?.length || 0) > 0 ? (
                        <DataView
                            value={groupedEvidence["Performance"]}
                            itemTemplate={evidenceTemplate}
                            layout="list"
                        />
                    ) : (
                        <div className="py-4 text-center surface-ground border-round my-2">
                            <i className="pi pi-check-circle text-green-500 text-lg mb-1 block"></i>
                            <span className="text-500 text-xs">No performance or latency anomalies flagged in this window.</span>
                        </div>
                    )}
                </TabPanel>

                <TabPanel header={`Application (${groupedEvidence["Application"]?.length || 0})`}>
                    {(groupedEvidence["Application"]?.length || 0) > 0 ? (
                        <DataView
                            value={groupedEvidence["Application"]}
                            itemTemplate={evidenceTemplate}
                            layout="list"
                        />
                    ) : (
                        <div className="py-4 text-center surface-ground border-round my-2">
                            <i className="pi pi-check-circle text-green-500 text-lg mb-1 block"></i>
                            <span className="text-500 text-xs">No application exceptions or error spikes flagged in this window.</span>
                        </div>
                    )}
                </TabPanel>

                <TabPanel header={`Infrastructure (${groupedEvidence["Infrastructure"]?.length || 0})`}>
                    {(groupedEvidence["Infrastructure"]?.length || 0) > 0 ? (
                        <DataView
                            value={groupedEvidence["Infrastructure"]}
                            itemTemplate={evidenceTemplate}
                            layout="list"
                        />
                    ) : (
                        <div className="py-4 text-center surface-ground border-round my-2">
                            <i className="pi pi-check-circle text-green-500 text-lg mb-1 block"></i>
                            <span className="text-500 text-xs">No infrastructure alarms or dependency faults flagged in this window.</span>
                        </div>
                    )}
                </TabPanel>
            </TabView>

            {/* Evidence Provenance Dialog */}
            <EvidenceProvenanceDialog
                visible={provenanceDialogOpen}
                onHide={() => setProvenanceDialogOpen(false)}
                sourceData={selectedProvenance}
            />
        </Card>
    );
}