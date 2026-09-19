import { useNavigate } from "react-router-dom";
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

    return (
        <div
            className="investigation-card"
            onClick={openInvestigation}
            style={{ cursor: "pointer" }}
        >
            <h2>{displayTitle}</h2>

            <p>
                <strong>Incident ID:</strong>{" "}
                {investigation.incident_id || id}
            </p>

            <p>
                <strong>Severity:</strong>{" "}
                {investigation.severity || "LOW"}
            </p>

            <p>
                <strong>Status:</strong>{" "}
                {displayStatus}
            </p>

            <p>
                <strong>Confidence:</strong>{" "}
                {investigation.confidence ?? 0}%
            </p>
        </div>
    );
}