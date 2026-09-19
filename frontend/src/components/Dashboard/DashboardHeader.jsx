export default function DashboardHeader({ onRefresh, refreshing = false }) {
    const now = new Date();
    const formattedTime = now.toLocaleString();

    return (
        <div className="dashboard-header">
            <div>
                <h1>Investigation workspace</h1>
                <p>
                    Multi-signal telemetry evidence correlation, AI reasoning, and human-in-the-loop decisions.
                </p>
                <p className="dashboard-time">
                    Updated {formattedTime}
                </p>
            </div>
            <div className="dashboard-actions">
                <button className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
                    <i className={refreshing ? "pi pi-spin pi-spinner" : "pi pi-refresh"} />
                    {refreshing ? " Refreshing" : " Refresh"}
                </button>
            </div>
        </div>
    );
}
