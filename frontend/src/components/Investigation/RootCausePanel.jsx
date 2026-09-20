import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { resolveReviewStatus } from "../../utils/telemetryContext";
import "../../styles/root-cause-panel.css";

export default function RootCausePanel({ investigation }) {
    if (!investigation) return null;

    const report = investigation.report || investigation.final_report || {};
    const rawRootCauses = report.root_causes || investigation.root_causes || [];

    // Parse root cause if string-serialized
    const rootCauses = rawRootCauses.map((rc) => {
        if (typeof rc === "string") {
            try {
                return JSON.parse(rc);
            } catch {
                const parsed = { probable_cause: rc, hypothesis: rc };
                const matchProbable = rc.match(/probable_cause=['"]([^'"]+)['"]/);
                if (matchProbable) parsed.probable_cause = matchProbable[1];
                const matchSummary = rc.match(/summary=['"]([^'"]+)['"]/);
                if (matchSummary) parsed.summary = matchSummary[1];
                const matchConf = rc.match(/confidence=([0-9]+)/);
                if (matchConf) parsed.confidence = parseInt(matchConf[1], 10);
                const matchService = rc.match(/service_name=['"]([^'"]+)['"]/);
                if (matchService) parsed.service_name = matchService[1];
                return parsed;
            }
        }
        return rc;
    });

    const review = resolveReviewStatus(investigation);

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-compass text-700"></i>
                <span className="font-semibold text-base">{review.panelTitle}</span>
            </div>
            {rootCauses.length > 0 && (
                <Tag
                    value={`${rootCauses[0]?.confidence ?? investigation.confidence ?? 80}% Confidence`}
                    severity="info"
                    className="text-xs font-semibold"
                />
            )}
        </div>
    );

    if (rootCauses.length === 0) {
        return (
            <Card header={headerTemplate} className="root-cause-panel-card shadow-1 border-1 surface-border">
                <div className="py-4 text-center surface-ground border-round">
                    <i className="pi pi-info-circle text-500 text-lg mb-1 block"></i>
                    <span className="text-500 text-xs">No root cause hypotheses synthesized for this incident.</span>
                </div>
            </Card>
        );
    }

    return (
        <Card header={headerTemplate} className="root-cause-panel-card shadow-1 border-1 surface-border">
            <div className="flex flex-column gap-3">
                {rootCauses.map((rootCause, idx) => (
                    <div key={idx} className="surface-card border-1 surface-border border-round p-3">
                        {/* Service & Confidence Row */}
                        <div className="grid mb-2">
                            <div className="col-12 sm:col-6">
                                <div className="surface-ground p-2 border-round border-1 surface-border">
                                    <span className="text-500 text-xs font-medium block mb-1">Service</span>
                                    <span className="font-mono text-800 text-sm font-semibold flex align-items-center gap-1">
                                        <i className="pi pi-server text-xs text-primary"></i>
                                        {rootCause.service_name || investigation.service_name || "api-gateway"}
                                    </span>
                                </div>
                            </div>
                            <div className="col-12 sm:col-6">
                                <div className="surface-ground p-2 border-round border-1 surface-border">
                                    <span className="text-500 text-xs font-medium block mb-1">Confidence</span>
                                    <span className="font-bold text-sm text-primary flex align-items-center gap-1">
                                        <i className="pi pi-shield text-xs"></i>
                                        {rootCause.confidence ?? rootCause.confidence_score ?? investigation.confidence ?? 80}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Primary Hypothesis Row */}
                        <div className="surface-ground p-3 border-round border-1 surface-border">
                            <span className="text-700 text-xs font-semibold block mb-1">
                                {idx === 0 ? review.primaryLabel : `Candidate Hypothesis #${idx + 1}`}
                            </span>
                            <p className="text-800 text-sm m-0 line-height-3 font-medium">
                                {rootCause.probable_cause || rootCause.hypothesis || rootCause.summary || "Service degradation due to elevated request response time and error rate."}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
