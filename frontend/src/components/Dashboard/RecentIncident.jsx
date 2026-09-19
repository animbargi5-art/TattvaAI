import { useNavigate } from "react-router-dom";

export default function RecentIncidents({ investigations = [] }) {
    const navigate = useNavigate();

    const recent = [...investigations]
        .sort(
            (a, b) =>
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
        )
        .slice(0, 5);

    return (
        <div className="recent-incidents">
            <h2>Recent Investigations</h2>
            {recent.length === 0 ? (
                <p>No investigations found.</p>
            ) : (
                recent.map(item => {
                    const id = item.investigation_id || item.id || item.incident_id;
                    const title = (item.title && item.title !== "Unknown Incident")
                        ? item.title
                        : (item.service_name
                            ? `Incident: ${item.service_name.toUpperCase()} Service`
                            : `Incident ${item.incident_id || id || ''}`);
                    const status = (item.status && item.status !== "UNKNOWN") ? item.status : "COMPLETED";

                    return (
                        <div
                            key={id}
                            className="recent-card"
                            onClick={() => {
                                if (id) navigate(`/investigation/${id}`);
                            }}
                            style={{ cursor: "pointer" }}
                        >
                            <h3>{title}</h3>
                            <p>
                                <strong>Severity:</strong> {item.severity || "LOW"}
                            </p>
                            <p>
                                <strong>Status:</strong> {status}
                            </p>
                            <p>
                                <strong>Confidence:</strong> {item.confidence ?? 0}%
                            </p>
                        </div>
                    );
                })
            )}
        </div>
    );
}