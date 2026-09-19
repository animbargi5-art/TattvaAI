import "../../styles/recommendation-panel.css";

export default function RecommendationPanel({ investigation }) {
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

    return (
        <div className="recommendation-panel">
            <h2>Recommended Remediation Actions</h2>
            {recommendations.length === 0 ? (
                <p>No recommendations available.</p>
            ) : (
                <div className="recommendation-list">
                    {recommendations.map((item, index) => (
                        <div key={index} className="recommendation-item">
                            <div className="flex align-items-center justify-content-between mb-2">
                                <h4 className="m-0">{item.title || `Action ${index + 1}`}</h4>
                                {(item.type || item.priority) && (
                                    <span className="text-xs font-semibold px-2 py-1 border-round bg-blue-100 text-blue-800">
                                        {item.type || item.priority}
                                    </span>
                                )}
                            </div>
                            <p className="m-0 text-700">{item.description || item.action || item.summary}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}