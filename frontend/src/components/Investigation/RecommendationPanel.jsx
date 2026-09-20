import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import "../../styles/recommendation-panel.css";

export default function RecommendationPanel({ investigation }) {
    if (!investigation) return null;

    const report = investigation?.report || investigation?.final_report || {};
    const rawRecommendations = report.recommendations || investigation?.recommendations || [];

    // Defensively handle string-serialized recommendations
    const recommendations = rawRecommendations.map((item, index) => {
        if (typeof item === "string") {
            try {
                return JSON.parse(item);
            } catch {
                const parsed = { title: `Remediation Action ${index + 1}`, description: item };
                const matchTitle = item.match(/title=['"]([^'"]+)['"]/);
                if (matchTitle) parsed.title = matchTitle[1];
                const matchDesc = item.match(/action=['"]([^'"]+)['"]/) || item.match(/description=['"]([^'"]+)['"]/);
                if (matchDesc) parsed.description = matchDesc[1];
                const matchType = item.match(/priority=['"]([^'"]+)['"]/) || item.match(/category=['"]([^'"]+)['"]/);
                if (matchType) parsed.type = matchType[1];
                return parsed;
            }
        }
        return item;
    });

    const getPrioritySeverity = (priority = "") => {
        const p = priority.toUpperCase();
        if (p.includes("P1") || p.includes("IMMEDIATE") || p.includes("CRITICAL")) return "danger";
        if (p.includes("P2") || p.includes("HIGH") || p.includes("WARN")) return "warning";
        if (p.includes("LONG_TERM") || p.includes("P3")) return "info";
        return "secondary";
    };

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-check-square text-700"></i>
                <span className="font-semibold text-base">Recommended Remediation Actions</span>
            </div>
            <Tag value={`${recommendations.length} Actions`} severity="info" className="text-xs font-semibold" />
        </div>
    );

    return (
        <Card header={headerTemplate} className="recommendation-panel-card shadow-1 border-1 surface-border">
            {recommendations.length === 0 ? (
                <div className="py-4 text-center surface-ground border-round">
                    <i className="pi pi-info-circle text-500 text-lg mb-1 block"></i>
                    <span className="text-500 text-xs">No remediation steps available.</span>
                </div>
            ) : (
                <div className="flex flex-column gap-3">
                    {recommendations.map((item, index) => {
                        const priority = item.type || item.priority || (index === 0 ? "P1 - IMMEDIATE" : "P2 - MITIGATION");
                        return (
                            <div key={index} className="surface-card border-1 surface-border border-round p-3">
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <h4 className="m-0 text-sm font-semibold text-900">
                                        {item.title || `Remediation Step #${index + 1}`}
                                    </h4>
                                    <Tag
                                        value={priority}
                                        severity={getPrioritySeverity(priority)}
                                        className="text-xs font-bold px-2 py-0"
                                    />
                                </div>
                                <p className="m-0 text-xs text-700 line-height-3">
                                    {item.description || item.action || item.summary || "Implement mitigation to isolate the failing microservice dependency."}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}