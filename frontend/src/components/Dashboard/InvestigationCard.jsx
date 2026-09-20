import { useNavigate } from "react-router-dom";
import { Tag } from "primereact/tag";
import "../../styles/investigation-card.css";

export default function InvestigationCard({ investigation }) {
    const navigate = useNavigate();

    const id = investigation.investigation_id || investigation.id || investigation.incident_id;

    function openInvestigation() {
        if (id) {
            navigate(`/investigation/${id}`);
        }
    }

    const displayTitle = (investigation.title && investigation.title !== "Unknown Incident")
        ? investigation.title
        : (investigation.service_name
            ? `Incident: ${investigation.service_name.toUpperCase()} Service`
            : `Incident ${investigation.incident_id || id || ''}`);

    const displayStatus = (investigation.status && investigation.status !== "UNKNOWN")
        ? investigation.status
        : "COMPLETED";

    const severity = (investigation.severity || "LOW").toUpperCase();
    const severityMap = {
        CRITICAL: "danger",
        HIGH: "warning",
        MEDIUM: "info",
        LOW: "success"
    };

    return (
        <div
            className="investigation-card p-3 mb-2"
            onClick={openInvestigation}
            style={{ cursor: "pointer" }}
        >
            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2 mb-2">
                <h4 className="investigation-card-title m-0 text-900 font-semibold" style={{ fontSize: "0.9375rem" }}>
                    {displayTitle}
                </h4>
                <div className="flex align-items-center gap-2">
                    <Tag 
                        value={severity} 
                        severity={severityMap[severity] || "info"} 
                        className="text-xs font-semibold px-2 py-0"
                    />
                    <Tag 
                        value={displayStatus} 
                        severity={displayStatus === "COMPLETED" ? "success" : "info"} 
                        className="text-xs font-semibold px-2 py-0"
                    />
                </div>
            </div>

            <div className="flex flex-wrap align-items-center justify-content-between text-xs text-600 gap-2 pt-1 border-top-1 surface-border">
                <div className="flex align-items-center gap-1">
                    <span className="text-500 font-medium">Incident ID:</span>
                    <span className="font-mono text-800 font-semibold">{investigation.incident_id || id}</span>
                </div>
                <div className="flex align-items-center gap-1">
                    <span className="text-500 font-medium">Confidence:</span>
                    <span className="font-semibold text-primary">{investigation.confidence ?? 0}%</span>
                </div>
            </div>
        </div>
    );
}