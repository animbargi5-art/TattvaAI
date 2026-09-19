import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { TabView, TabPanel } from "primereact/tabview";
import { DataView } from "primereact/dataview";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";
import { Message } from "primereact/message";
import { Accordion, AccordionTab } from "primereact/accordion";
import { resolveTelemetryContext, getSignalLabel } from "../../utils/telemetryContext";

export default function EvidencePanel({ investigation }) {
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

    // Group evidence by category
    const groupedEvidence = evidence.reduce((groups, item) => {
        const category = item.category || item.type || 'Other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
        return groups;
    }, {});

    const evidenceTemplate = (item, index) => {
        const severityInfo = getSeverityInfo(item.severity);
        // Centralized resolution of provider and mode:
        // Follows investigation source/mode, never infers "Mock / Demo" from item.source
        const telemetryCtx = resolveTelemetryContext(investigation, item);
        const signalLabel = getSignalLabel(item, telemetryCtx.provider.key);

        return (
            <Card className="evidence-card mb-3 surface-card border-1 surface-border shadow-1" key={index}>
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-3 gap-2">
                    <div className="flex align-items-center gap-2">
                        <i className={`${getEvidenceIcon(item.type)} text-primary`}
                           style={{ fontSize: '1.25rem' }}></i>
                        <h4 className="m-0 text-900 font-bold">{signalLabel}</h4>
                        <Tag
                            value={item.severity || "MEDIUM"}
                            severity={severityInfo.severity}
                            className="font-semibold text-xs"
                        />
                    </div>
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Tag
                            value={telemetryCtx.provider.label}
                            icon={telemetryCtx.provider.icon}
                            severity={telemetryCtx.provider.severity}
                            className="text-xs"
                        />
                        <Tag
                            value={telemetryCtx.mode.label}
                            severity={telemetryCtx.mode.severity}
                            className="text-xs font-bold"
                        />
                        <Badge
                            value={`${item.confidence ?? 80}% Conf.`}
                            severity="info"
                        />
                    </div>
                </div>

                <div className="mb-3">
                    <p className="text-700 line-height-3 m-0">
                        {item.summary || item.message || item.title || "No summary available"}
                    </p>
                </div>

                <div className="grid">
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
                                    <span className="text-700 text-xs">
                                        {new Date(item.timestamp).toLocaleString()}
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
                    <Accordion className="mt-3">
                        <AccordionTab header="Telemetry Signal Details">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="field">
                                        <label className="text-600 font-medium text-sm">Operation</label>
                                        <p className="m-0 mt-1 text-700">{item.operation || item.raw?.operation_name || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="col-12 md:col-6">
                                    <div className="field">
                                        <label className="text-600 font-medium text-sm">Status Code</label>
                                        <p className="m-0 mt-1 text-700">{item.trace?.status || item.raw?.status_code || '200'}</p>
                                    </div>
                                </div>

                                <div className="col-12 md:col-6">
                                    <div className="field">
                                        <label className="text-600 font-medium text-sm">Duration</label>
                                        <p className="m-0 mt-1 text-700">
                                            {item.trace?.duration_ms ? `${item.trace.duration_ms} ms` : item.raw?.duration_ms ? `${item.raw.duration_ms} ms` : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {(item.trace_id || item.trace?.trace_id || item.raw?.trace_id) && (
                                    <div className="col-12">
                                        <div className="field">
                                            <label className="text-600 font-medium text-sm">Trace ID</label>
                                            <p className="m-0 mt-1 text-700 font-mono text-sm">
                                                {item.trace_id || item.trace?.trace_id || item.raw?.trace_id}
                                            </p>
                                        </div>
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
                <span className="font-semibold">Investigation Evidence</span>
            </div>
            <Badge value={evidence.length} severity="info" />
        </div>
    );

    if (evidence.length === 0) {
        return (
            <Card header={headerTemplate} className="evidence-panel">
                <Message
                    severity="info"
                    text="No evidence available for this investigation."
                    className="w-full"
                />
            </Card>
        );
    }

    return (
        <Card header={headerTemplate} className="evidence-panel">
            {Object.keys(groupedEvidence).length > 1 ? (
                <TabView>
                    {Object.entries(groupedEvidence).map(([category, categoryEvidence]) => (
                        <TabPanel
                            key={category}
                            header={`${category} (${categoryEvidence.length})`}
                        >
                            <DataView
                                value={categoryEvidence}
                                itemTemplate={evidenceTemplate}
                                layout="list"
                            />
                        </TabPanel>
                    ))}
                </TabView>
            ) : (
                <DataView
                    value={evidence}
                    itemTemplate={evidenceTemplate}
                    layout="list"
                />
            )}
        </Card>
    );
}