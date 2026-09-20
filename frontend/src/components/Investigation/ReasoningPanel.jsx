import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { resolveReviewStatus } from "../../utils/telemetryContext";
import "../../styles/reasoning-panel.css";

export default function ReasoningPanel({ investigation }) {
    if (!investigation) return null;

    const reasoning = investigation?.report?.reasoning || investigation?.final_report?.reasoning || investigation?.reasoning || {};
    const conclusions = reasoning.reasoning || [];
    const suspiciousServices = reasoning.suspicious_services || [];
    const review = resolveReviewStatus(investigation);

    const getSeverityTag = (sev) => {
        const s = (sev || "CRITICAL").toUpperCase();
        switch (s) {
            case "CRITICAL": return "danger";
            case "HIGH": return "warning";
            case "MEDIUM": return "info";
            default: return "secondary";
        }
    };

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-bolt text-700"></i>
                <span className="font-semibold text-base">AI Reasoning Engine</span>
            </div>
            <Tag
                value={reasoning.highest_severity || "CRITICAL"}
                severity={getSeverityTag(reasoning.highest_severity)}
                className="text-xs font-bold px-2 py-0"
            />
        </div>
    );

    return (
        <Card header={headerTemplate} className="reasoning-panel-card shadow-1 border-1 surface-border">
            {/* Top Stat Summary Grid */}
            <div className="grid mb-3">
                <div className="col-4">
                    <div className="surface-ground p-2 border-round border-1 surface-border text-center">
                        <span className="text-500 text-xs block font-medium mb-1">Severity</span>
                        <span className="font-bold text-sm text-900">{reasoning.highest_severity || "CRITICAL"}</span>
                    </div>
                </div>
                <div className="col-4">
                    <div className="surface-ground p-2 border-round border-1 surface-border text-center">
                        <span className="text-500 text-xs block font-medium mb-1">Evidence Collected</span>
                        <span className="font-bold text-sm text-primary">{reasoning.evidence_count ?? 6}</span>
                    </div>
                </div>
                <div className="col-4">
                    <div className="surface-ground p-2 border-round border-1 surface-border text-center">
                        <span className="text-500 text-xs block font-medium mb-1">Correlations</span>
                        <span className="font-bold text-sm text-800">{reasoning.correlation_count ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* AI Candidate Hypotheses Section */}
            <div className="mb-3">
                <div className="flex align-items-center justify-content-between mb-2">
                    <span className="font-semibold text-xs text-800 uppercase letter-spacing-1">
                        AI Candidate Hypotheses
                    </span>
                    <span className="text-xs text-500 font-medium">({conclusions.length})</span>
                </div>

                {review.isPending && (
                    <div className="surface-orange-50 border-1 border-orange-200 border-round p-2 mb-2 text-xs text-orange-900 flex align-items-start gap-2">
                        <i className="pi pi-exclamation-circle text-orange-600 mt-1"></i>
                        <span>AI-synthesized candidate hypotheses awaiting verification in the Human Review section below.</span>
                    </div>
                )}

                {conclusions.length === 0 ? (
                    <p className="text-500 text-xs m-0">No reasoning hypotheses generated.</p>
                ) : (
                    <div className="flex flex-column gap-2">
                        {conclusions.map((item, index) => (
                            <div key={index} className="surface-ground p-2 border-round border-1 surface-border text-xs text-800 line-height-3 flex align-items-start gap-2">
                                <span className="text-primary font-bold">{review.isAccepted ? "✓" : "•"}</span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Impacted / Suspicious Services Section */}
            <div>
                <span className="font-semibold text-xs text-800 uppercase letter-spacing-1 block mb-2">
                    Impacted / Suspicious Services
                </span>

                {suspiciousServices.length === 0 ? (
                    <p className="text-500 text-xs m-0">No suspicious services detected.</p>
                ) : (
                    <div className="flex flex-column gap-2">
                        {suspiciousServices.map((service, index) => (
                            <div key={index} className="surface-card border-1 surface-border border-round p-2 text-xs flex align-items-center justify-content-between">
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-server text-xs text-primary"></i>
                                    <span className="font-mono font-semibold text-800">{service.service || "N/A"}</span>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    {service.endpoint && (
                                        <span className="font-mono text-500">{service.endpoint}</span>
                                    )}
                                    <Tag
                                        value={service.severity || "HIGH"}
                                        severity={getSeverityTag(service.severity)}
                                        className="text-xs font-bold px-2 py-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}