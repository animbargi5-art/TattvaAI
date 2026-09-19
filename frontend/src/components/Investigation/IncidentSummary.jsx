import "../../styles/incident-summary.css";

export default function IncidentSummary({ investigation }) {
    if (!investigation) return null;

    const report = investigation.report || investigation.final_report || {};
    const invId = investigation.investigation_id || investigation.id || investigation.incident_id;
    const incId = investigation.incident_id || report.incident_id || invId;

    const displayTitle = (investigation.title && investigation.title !== "Unknown Incident")
        ? investigation.title
        : (report.title && report.title !== "Unknown Incident")
            ? report.title
            : (investigation.service_name
                ? `Incident: ${investigation.service_name.replace(/[-_]/g, ' ').toUpperCase()} Service`
                : `Incident ${incId}`);

    const displayStatus = (investigation.status && investigation.status !== "UNKNOWN")
        ? investigation.status
        : (report.status && report.status !== "UNKNOWN")
            ? report.status
            : "COMPLETED";

    const displaySeverity = (investigation.severity && investigation.severity !== "UNKNOWN")
        ? investigation.severity
        : (report.severity || "LOW");

    const summary = report.executive_summary || investigation.executive_summary || "No summary available.";

    return (
        <div className="incident-summary">
            <h2>Incident Summary</h2>

            <div className="summary-grid">
                <div className="summary-card">
                    <span>Incident</span>
                    <h3>{displayTitle}</h3>
                </div>

                <div className="summary-card">
                    <span>ID</span>
                    <h3>{incId}</h3>
                </div>

                <div className="summary-card">
                    <span>Severity</span>
                    <h3>{displaySeverity}</h3>
                </div>

                <div className="summary-card">
                    <span>Status</span>
                    <h3>{displayStatus}</h3>
                </div>

                <div className="summary-card">
                    <span>Confidence</span>
                    <h3>{investigation.confidence ?? report.confidence ?? 0}%</h3>
                </div>

                <div className="summary-card">
                    <span>Evidence</span>
                    <h3>{report.evidence_count ?? report.evidence?.length ?? investigation.evidence?.length ?? 0}</h3>
                </div>

                <div className="summary-card">
                    <span>Recommendations</span>
                    <h3>{report.recommendation_count ?? report.recommendations?.length ?? investigation.recommendations?.length ?? 0}</h3>
                </div>

                <div className="summary-card">
                    <span>Timeline Events</span>
                    <h3>{report.timeline?.length ?? investigation.timeline?.length ?? 0}</h3>
                </div>
            </div>
            <p>{summary}</p>
        </div>
    );
}
