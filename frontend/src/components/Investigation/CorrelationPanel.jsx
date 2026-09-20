import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import "../../styles/correlation-panel.css";

export default function CorrelationPanel({ investigation }) {
    if (!investigation) return null;

    const correlations = investigation?.report?.correlations || investigation?.final_report?.correlations || investigation?.correlations || [];

    const getSeverityTag = (sev) => {
        const s = (sev || "HIGH").toUpperCase();
        switch (s) {
            case "CRITICAL": return "danger";
            case "HIGH": return "warning";
            case "MEDIUM": return "info";
            case "LOW": return "success";
            default: return "secondary";
        }
    };

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-sliders-h text-700"></i>
                <span className="font-semibold text-base">Correlation Analysis</span>
            </div>
            <Tag value={`${correlations.length} Findings`} severity="info" className="text-xs font-semibold" />
        </div>
    );

    return (
        <Card header={headerTemplate} className="correlation-panel-card shadow-1 border-1 surface-border">
            {correlations.length === 0 ? (
                <div className="py-4 text-center surface-ground border-round">
                    <i className="pi pi-check-circle text-green-500 text-lg mb-1 block"></i>
                    <span className="text-500 text-xs">No multi-signal correlations flagged. Telemetry is within normal baseline.</span>
                </div>
            ) : (
                <div className="flex flex-column gap-3">
                    {correlations.map((item, index) => (
                        <div key={index} className="surface-card border-1 surface-border border-round p-3">
                            {/* Service Header + Severity Badge */}
                            <div className="flex align-items-center justify-content-between mb-3">
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-server text-primary"></i>
                                    <span className="font-bold text-sm text-900 font-mono">
                                        {item.service_name || investigation.service_name || "TattvaAI-Backend"}
                                    </span>
                                </div>
                                <Tag
                                    value={item.severity || "HIGH"}
                                    severity={getSeverityTag(item.severity)}
                                    className="text-xs font-bold px-2 py-0"
                                />
                            </div>

                            {/* Summary Metrics */}
                            <div className="surface-ground p-2 border-round border-1 surface-border mb-3 flex align-items-center justify-content-between text-xs">
                                <span className="text-500 font-medium">Summary metrics:</span>
                                <span className="font-semibold text-800">
                                    Total Findings: <span className="text-primary font-bold">{item.evidence_count || item.evidence?.length || 0}</span>
                                </span>
                            </div>

                            {/* Finding Types */}
                            {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                                <div className="mb-3">
                                    <span className="text-500 font-medium text-xs block mb-1">Finding Types:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {item.evidence.map((ev, i) => (
                                            <span
                                                key={i}
                                                className="surface-100 text-700 text-xs px-2 py-1 border-round border-1 surface-border font-medium flex align-items-center gap-1"
                                            >
                                                <i className="pi pi-bolt text-xs text-primary"></i>
                                                {ev.type || ev.summary || "Critical Slow API"}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Possible Causes */}
                            {Array.isArray(item.possible_causes) && item.possible_causes.length > 0 && (
                                <div className="surface-blue-50 border-1 border-blue-200 border-round p-2">
                                    <span className="text-xs font-semibold text-blue-900 block mb-1">
                                        Possible Causes:
                                    </span>
                                    <div className="flex flex-column gap-1">
                                        {item.possible_causes.map((cause, i) => (
                                            <div key={i} className="text-xs text-blue-800 line-height-2 flex align-items-start gap-1">
                                                <span className="text-primary font-bold">•</span>
                                                <span>{cause}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
