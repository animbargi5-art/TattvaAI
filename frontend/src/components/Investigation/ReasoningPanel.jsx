import { resolveReviewStatus } from "../../utils/telemetryContext";
import "../../styles/reasoning-panel.css";

export default function ReasoningPanel({ investigation }) {
    if (!investigation) {
        return null;
    }

    const reasoning = investigation?.report?.reasoning || investigation?.final_report?.reasoning || investigation?.reasoning || {};
    const conclusions = reasoning.reasoning || [];
    const suspiciousServices = reasoning.suspicious_services || [];
    const review = resolveReviewStatus(investigation);

    return (
        <div className="reasoning-panel">
            <h2>🧠 AI Reasoning Engine</h2>

            <div className="reasoning-grid">
                <div className="reasoning-item">
                    <span>Highest Severity</span>
                    <strong className={`severity ${String(reasoning.highest_severity || "").toLowerCase()}`}>
                        {reasoning.highest_severity ?? "N/A"}
                    </strong>
                </div>

                <div className="reasoning-item">
                    <span>Evidence Collected</span>
                    <strong>
                        {reasoning.evidence_count ?? 0}
                    </strong>
                </div>

                <div className="reasoning-item">
                    <span>Graph Nodes</span>
                    <strong>
                        {reasoning.graph_nodes ?? 0}
                    </strong>
                </div>

                <div className="reasoning-item">
                    <span>Graph Edges</span>
                    <strong>
                        {reasoning.graph_edges ?? 0}
                    </strong>
                </div>

                <div className="reasoning-item">
                    <span>Correlations</span>
                    <strong>
                        {reasoning.correlation_count ?? 0}
                    </strong>
                </div>
            </div>

            <div className="reasoning-conclusions">
                <h3>📋 {review.aiConclusionsHeading}</h3>
                {review.isPending && (
                    <p className="text-xs text-500 mb-2 italic">
                        AI-synthesized candidate hypotheses awaiting verification in the Human Review section below.
                    </p>
                )}

                {conclusions.length === 0 ? (
                    <p>No reasoning hypotheses available.</p>
                ) : (
                    <ul>
                        {conclusions.map((item, index) => (
                            <li key={index}>
                                {review.isAccepted ? "✅ " : "💡 "}{item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="reasoning-services">
                <h3>🚨 Impacted / Suspicious Services</h3>

                {suspiciousServices.length === 0 ? (
                    <p>No suspicious services detected.</p>
                ) : (
                    suspiciousServices.map((service, index) => (
                        <div key={index} className="service-card">
                            <div>
                                <span>Service</span>
                                <strong>{service.service || "N/A"}</strong>
                            </div>
                            <div>
                                <span>Severity</span>
                                <strong className={`severity ${String(service.severity || "").toLowerCase()}`}>
                                    {service.severity || "N/A"}
                                </strong>
                            </div>
                            <div>
                                <span>Endpoint</span>
                                <strong>{service.endpoint || "N/A"}</strong>
                            </div>
                            <div>
                                <span>Incident</span>
                                <strong>{service.incident || "N/A"}</strong>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}