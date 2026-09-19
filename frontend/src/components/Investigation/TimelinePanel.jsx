import React from "react";
import { Tag } from "primereact/tag";
import { CANONICAL_STAGES, getCanonicalStageRank } from "../../utils/telemetryContext";
import "../../styles/timeline-panel.css";

export default function TimelinePanel({ investigation }) {
    const rawTimeline = investigation?.report?.timeline || investigation?.final_report?.timeline || investigation?.timeline || [];

    if (!rawTimeline || rawTimeline.length === 0) {
        return (
            <div className="timeline-panel">
                <h2>Investigation Timeline</h2>
                <p>No timeline available.</p>
            </div>
        );
    }

    // Map each timeline event to its canonical stage rank and metadata
    const parsedEvents = rawTimeline.map((rawItem, originalIdx) => {
        const message = typeof rawItem === "string" ? rawItem : (rawItem.message || rawItem.description || rawItem.title || JSON.stringify(rawItem));
        const timestamp = typeof rawItem === "object" ? rawItem.timestamp : null;
        const rank = getCanonicalStageRank(rawItem);
        const stageDef = CANONICAL_STAGES.find(s => s.stageNumber === rank);

        return {
            originalIdx,
            rank,
            stageNumber: stageDef ? stageDef.stageNumber : (rank === 9 ? 9 : originalIdx + 1),
            stageName: stageDef ? stageDef.name : (rank === 9 ? "Report Generation" : "Investigation Event"),
            icon: stageDef ? stageDef.icon : (rank === 9 ? "pi pi-file-export" : "pi pi-info-circle"),
            message,
            timestamp
        };
    });

    // Canonical 8-Stage ordering:
    // 1. Trace Agent
    // 2. Logs Agent
    // 3. Metrics Agent
    // 4. Dependency Agent
    // 5. Alert Agent
    // 6. Historical Agent
    // 7. Evidence Correlation
    // 8. AI Reasoning
    // 9. Report Agent
    const sortedEvents = [...parsedEvents].sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.originalIdx - b.originalIdx;
    });

    return (
        <div className="timeline-panel">
            <div className="flex align-items-center justify-content-between mb-3">
                <h2 className="m-0">Investigation Timeline</h2>
                <Tag value={`${sortedEvents.length} Events`} severity="info" className="text-xs font-semibold" />
            </div>

            <div className="timeline-container">
                <div className="timeline-list">
                    {sortedEvents.map((event, index) => (
                        <div key={index} className={`timeline-item ${event.stageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                            <div className="flex align-items-center justify-content-between mb-2">
                                <div className="flex align-items-center gap-2">
                                    <i className={`${event.icon} text-primary font-bold text-sm`}></i>
                                    <h3 className="m-0 text-900 font-bold text-sm">{event.stageName}</h3>
                                </div>
                                <span className="p-tag p-tag-secondary text-xs px-2 py-1 font-semibold">
                                    Step {event.stageNumber <= 8 ? event.stageNumber : index + 1}
                                </span>
                            </div>
                            <p className="text-700 m-0 line-height-3 text-sm">
                                {event.message}
                            </p>
                            {event.timestamp && (
                                <small className="text-500 mt-2 block text-xs">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </small>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
