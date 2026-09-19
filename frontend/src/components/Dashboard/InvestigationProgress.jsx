import { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import { Timeline } from "primereact/timeline";
import { Badge } from "primereact/badge";
import { Skeleton } from "primereact/skeleton";

const investigationSteps = [
    {
        label: "Trace Agent",
        icon: "pi pi-search",
        description: "Distributed spans & latency anomalies"
    },
    {
        label: "Logs Agent",
        icon: "pi pi-file-o",
        description: "Structured errors & stack traces"
    },
    {
        label: "Metrics Agent",
        icon: "pi pi-chart-line",
        description: "Evaluating metrics anomalies"
    },
    {
        label: "Dependency Agent",
        icon: "pi pi-sitemap",
        description: "Mapping service topology & blast radius"
    },
    {
        label: "Alert Agent",
        icon: "pi pi-bell",
        description: "Correlating active alerts & SLOs"
    },
    {
        label: "Historical Agent",
        icon: "pi pi-history",
        description: "Recalling past incident patterns"
    },
    {
        label: "Evidence Correlation",
        icon: "pi pi-sliders-h",
        description: "Cross-signal temporal correlation"
    },
    {
        label: "AI Reasoning",
        icon: "pi pi-bolt",
        description: "Amazon Bedrock AI reasoning"
    }
];

export default function InvestigationProgress({ status, running }) {
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!running) {
            setVisibleSteps([]);
            setCurrentStep(0);
            return;
        }

        let current = 0;
        const timer = setInterval(() => {
            if (current < investigationSteps.length) {
                setVisibleSteps(prev => [...prev, {
                    ...investigationSteps[current],
                    status: 'completed',
                    timestamp: new Date()
                }]);
                setCurrentStep(current + 1);
                current++;
            } else {
                clearInterval(timer);
            }
        }, 800); // Slightly slower for better UX

        return () => clearInterval(timer);
    }, [running]);

    const progressPercentage = Math.round((currentStep / investigationSteps.length) * 100);

    const headerTemplate = () => (
        <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-cog text-700"></i>
                <span className="font-semibold">AI Investigation Progress</span>
            </div>
            {running && (
                <Badge
                    value={`${currentStep}/${investigationSteps.length}`}
                    severity="info"
                />
            )}
        </div>
    );

    const timelineItemTemplate = (item) => (
        <div className="flex align-items-center gap-3">
            <div className="flex align-items-center justify-content-center bg-primary border-circle"
                 style={{ minWidth: '2rem', height: '2rem' }}>
                <i className={`${item.icon} text-white`} style={{ fontSize: '0.875rem' }}></i>
            </div>
            <div className="flex-1">
                <div className="flex align-items-center gap-2 mb-1">
                    <span className="font-semibold text-900">{item.label}</span>
                    <i className="pi pi-check text-green-500"></i>
                </div>
                <p className="text-600 text-sm m-0 mb-1">{item.description}</p>
                <small className="text-500">
                    {item.timestamp?.toLocaleTimeString()}
                </small>
            </div>
        </div>
    );

    if (!running && visibleSteps.length === 0) {
        return (
            <Card header={headerTemplate} className="progress-panel">
                <div className="text-center py-4">
                    <i className="pi pi-pause text-500" style={{ fontSize: '2rem' }}></i>
                    <p className="text-600 mt-2 mb-0">
                        No investigation currently running
                    </p>
                    <small className="text-500">
                        Start a new investigation to see progress here
                    </small>
                </div>
            </Card>
        );
    }

    return (
        <Card header={headerTemplate} className="progress-panel">
            {running && (
                <div className="mb-4">
                    <div className="flex align-items-center justify-content-between mb-2">
                        <span className="text-sm text-600">Overall Progress</span>
                        <span className="text-sm font-semibold">{progressPercentage}%</span>
                    </div>
                    <ProgressBar
                        value={progressPercentage}
                        className="h-1rem"
                        color={progressPercentage === 100 ? '#22c55e' : undefined}
                    />
                </div>
            )}

            {visibleSteps.length > 0 && (
                <Timeline
                    value={visibleSteps}
                    content={timelineItemTemplate}
                    className="investigation-timeline"
                />
            )}

            {running && currentStep < investigationSteps.length && (
                <div className="mt-3 p-3 bg-blue-50 border-round">
                    <div className="flex align-items-center gap-2">
                        <div className="pi pi-spin pi-spinner text-primary"></div>
                        <span className="text-primary font-semibold">
                            Currently: {investigationSteps[currentStep]?.label}
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
}