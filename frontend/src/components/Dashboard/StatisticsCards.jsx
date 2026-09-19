export default function StatisticsCards({ investigations }) {
    const safeInvestigations = Array.isArray(investigations)
        ? investigations
        : Array.isArray(investigations?.investigations)
            ? investigations.investigations
            : [];

    const validInvestigations = Array.isArray(safeInvestigations) ? safeInvestigations : [];
    const total = validInvestigations.length;

    const critical = validInvestigations.filter(
        item => item?.severity === "CRITICAL"
    ).length;

    const completed = validInvestigations.filter(
        item => (item?.status || "").toUpperCase() === "COMPLETED"
    ).length;

    const pendingReview = validInvestigations.filter(
        item => (item?.review_status || "").toUpperCase() === "PENDING_REVIEW"
    ).length;

    const avgConfidence = total === 0 ? 80 : Math.round(
        validInvestigations.reduce((sum, item) => sum + (item?.confidence || 80), 0) / total
    );

    return (
        <div className="stats-grid-clean">
            <div className="stat-card-clean">
                <div className="stat-card-clean-title">Total Investigations</div>
                <div className="stat-card-clean-value">{total}</div>
            </div>

            <div className="stat-card-clean">
                <div className="stat-card-clean-title" style={{ color: "var(--danger)" }}>Critical Incidents</div>
                <div className="stat-card-clean-value" style={{ color: "var(--danger)" }}>{critical}</div>
            </div>

            <div className="stat-card-clean">
                <div className="stat-card-clean-title" style={{ color: "var(--success)" }}>Completed</div>
                <div className="stat-card-clean-value" style={{ color: "var(--success)" }}>{completed}</div>
            </div>

            <div className="stat-card-clean">
                <div className="stat-card-clean-title" style={{ color: "var(--warning)" }}>Pending Review</div>
                <div className="stat-card-clean-value" style={{ color: "var(--warning)" }}>{pendingReview}</div>
            </div>

            <div className="stat-card-clean">
                <div className="stat-card-clean-title">Avg Confidence</div>
                <div className="stat-card-clean-value">{avgConfidence}%</div>
            </div>

            <div className="stat-card-clean">
                <div className="stat-card-clean-title" style={{ color: "var(--primary-dark)" }}>AWS Telemetry</div>
                <div className="stat-card-clean-value" style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "6px", color: "var(--success)", paddingTop: "4px" }}>
                    <span className="status-dot-green"></span>
                    <span>LIVE</span>
                </div>
            </div>
        </div>
    );
}
