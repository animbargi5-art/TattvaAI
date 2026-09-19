import { resolveReviewStatus } from "../../utils/telemetryContext";
import "../../styles/root-cause-panel.css";

export default function RootCausePanel({ investigation }) {
    if (!investigation) {
        return null;
    }

    const report = investigation.report || investigation.final_report || {};
    const rawRootCauses = report.root_causes || investigation.root_causes || [];

    // Parse root cause if string-serialized (e.g. Python repr from DynamoDB)
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

    if (rootCauses.length === 0) {
        return (
            <div className="root-cause-panel">
                <h2>{review.panelTitle}</h2>
                <p>No hypotheses or root causes available.</p>
            </div>
        );
    }

    return (
        <div className="root-cause-panel">
            <h2>{review.panelTitle}</h2>
            <div className="flex flex-column gap-3">
                {rootCauses.map((rootCause, idx) => (
                    <div key={idx} className="root-cause-card">
                        <div className="root-cause-item">
                            <span>Service</span>
                            <strong>{rootCause.service_name || investigation.service_name || "service"}</strong>
                        </div>

                        <div className="root-cause-item">
                            <span>Confidence</span>
                            <strong>{rootCause.confidence ?? rootCause.confidence_score ?? investigation.confidence ?? 0}%</strong>
                        </div>

                        <div className="root-cause-item full">
                            <span>{idx === 0 ? review.primaryLabel : `Candidate Hypothesis #${idx + 1}`}</span>
                            <strong>{rootCause.probable_cause || rootCause.hypothesis || rootCause.summary}</strong>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
