/**
 * ===============================================================================
 * TattvaAI - Centralized Telemetry Context Resolution Utility
 * ===============================================================================
 * 
 * Ensures single source of truth for telemetry provider, mode, environment,
 * and review status throughout all investigation UI components.
 * 
 * Rules:
 * 1. An investigation has ONE canonical telemetry source and mode.
 * 2. Evidence items inherit from the investigation unless explicitly overridden.
 *    NOTE: 'item.source' in the backend represents the agent signal type
 *    ('trace', 'logs', 'metrics', etc.), NOT the telemetry provider!
 * 3. NEVER produce "Mock / Demo + LIVE". Mock/Demo is strictly DEMO mode.
 * 4. For AWS Observability, live investigations must always report LIVE mode.
 * 5. Review-dependent language: When review is pending, hypotheses are labeled
 *    "Primary Hypothesis" / "AI Candidate Hypothesis", never "Primary Root Cause".
 */

export const PROVIDER_DEFINITIONS = {
    aws: {
        key: "aws",
        label: "AWS Observability",
        icon: "pi pi-cloud",
        severity: "info",
        defaultMode: "LIVE",
        liveLabel: "LIVE TELEMETRY"
    },
    signoz: {
        key: "signoz",
        label: "SigNoz",
        icon: "pi pi-chart-bar",
        severity: "warning",
        defaultMode: "LIVE",
        liveLabel: "LIVE TELEMETRY"
    },
    opentelemetry: {
        key: "opentelemetry",
        label: "OpenTelemetry Backend",
        icon: "pi pi-share-alt",
        severity: "help",
        defaultMode: "LIVE",
        liveLabel: "LIVE INGESTION"
    },
    otlp: {
        key: "opentelemetry",
        label: "OpenTelemetry Backend",
        icon: "pi pi-share-alt",
        severity: "help",
        defaultMode: "LIVE",
        liveLabel: "LIVE INGESTION"
    },
    mock: {
        key: "mock",
        label: "Mock / Demo",
        icon: "pi pi-box",
        severity: "secondary",
        defaultMode: "DEMO",
        liveLabel: "SYNTHETIC DEMO"
    },
    demo: {
        key: "mock",
        label: "Mock / Demo",
        icon: "pi pi-box",
        severity: "secondary",
        defaultMode: "DEMO",
        liveLabel: "SYNTHETIC DEMO"
    }
};

/**
 * Resolve provider and mode context from an investigation and optional evidence item.
 */
export function resolveTelemetryContext(investigation = {}, item = null) {
    const report = investigation?.report || investigation?.final_report || {};
    const incident = investigation?.incident || {};

    // 1. Resolve Provider
    // Precedence:
    // a. Explicit provider on item (item.provider, item.telemetry_source, item.raw?.attributes?.provider, item.metadata?.provider)
    //    CRITICAL: NEVER use item.source here! item.source is 'trace' / 'logs' / 'metrics'!
    // b. investigation.telemetry_source / incident.telemetry_source / report.telemetry_source
    // c. Neutral fallback: null
    let rawProvider = null;

    if (item && typeof item === "object") {
        const itemProv = 
            item.telemetry_source ||
            item.provider ||
            item.raw?.attributes?.provider ||
            item.metadata?.provider ||
            item.metadata?.telemetry_source;
        if (itemProv && typeof itemProv === "string") {
            rawProvider = itemProv.trim().toLowerCase();
        }
    }

    if (!rawProvider) {
        const invProv = 
            investigation.telemetry_source ||
            incident.telemetry_source ||
            report.telemetry_source;
        if (invProv && typeof invProv === "string") {
            rawProvider = invProv.trim().toLowerCase();
        }
    }

    let providerInfo;
    if (rawProvider && PROVIDER_DEFINITIONS[rawProvider]) {
        providerInfo = { ...PROVIDER_DEFINITIONS[rawProvider] };
    } else if (rawProvider) {
        providerInfo = {
            key: rawProvider,
            label: rawProvider.toUpperCase(),
            icon: "pi pi-server",
            severity: "secondary",
            defaultMode: "LIVE",
            liveLabel: "LIVE"
        };
    } else {
        providerInfo = {
            key: "unavailable",
            label: "Source unavailable",
            icon: "pi pi-question-circle",
            severity: "secondary",
            defaultMode: "DEMO",
            liveLabel: "Mode unavailable"
        };
    }

    // 2. Resolve Mode
    // Precedence:
    // a. Explicit mode on item
    // b. investigation.telemetry_mode / incident.telemetry_mode / report.telemetry_mode
    // c. Provider default
    let rawMode = null;
    if (item && typeof item === "object") {
        const itemMode = 
            item.telemetry_mode ||
            item.mode ||
            item.raw?.attributes?.mode ||
            item.metadata?.mode ||
            item.metadata?.telemetry_mode;
        if (itemMode && typeof itemMode === "string") {
            rawMode = itemMode.trim().toUpperCase();
        }
    }

    if (!rawMode) {
        const invMode = 
            investigation.telemetry_mode ||
            incident.telemetry_mode ||
            report.telemetry_mode;
        if (invMode && typeof invMode === "string") {
            rawMode = invMode.trim().toUpperCase();
        }
    }

    // STRICT GUARD: If provider is mock/demo, mode MUST BE DEMO! Never produce Mock / Demo + LIVE.
    let modeKey;
    let modeLabel;
    let modeSeverity;

    if (providerInfo.key === "mock" || providerInfo.key === "demo") {
        modeKey = "DEMO";
        modeLabel = "DEMO";
        modeSeverity = "warning";
    } else if (rawMode === "LIVE") {
        modeKey = "LIVE";
        modeLabel = "LIVE";
        modeSeverity = "success";
    } else if (rawMode === "DEMO" || rawMode === "SYNTHETIC") {
        modeKey = "DEMO";
        modeLabel = "DEMO";
        modeSeverity = "warning";
    } else if (providerInfo.key === "aws") {
        // AWS without explicit mode in production is LIVE
        modeKey = "LIVE";
        modeLabel = "LIVE";
        modeSeverity = "success";
    } else if (providerInfo.key === "unavailable") {
        modeKey = "unavailable";
        modeLabel = "Mode unavailable";
        modeSeverity = "secondary";
    } else {
        modeKey = providerInfo.defaultMode;
        modeLabel = providerInfo.defaultMode;
        modeSeverity = providerInfo.defaultMode === "LIVE" ? "success" : "warning";
    }

    // 3. Environment
    const environment = 
        investigation.environment ||
        incident.environment ||
        report.environment ||
        "Production";

    // 4. Service Name
    const serviceName = 
        investigation.service_name ||
        incident.service_name ||
        report.service_name ||
        (item?.service_name) ||
        "Service";

    return {
        provider: providerInfo,
        mode: {
            key: modeKey,
            label: modeLabel,
            severity: modeSeverity,
            tagLabel: modeKey === "LIVE" ? "LIVE TELEMETRY" : "SYNTHETIC / DEMO"
        },
        environment,
        serviceName,
        isLive: modeKey === "LIVE"
    };
}

/**
 * Return human-friendly signal label for an evidence card.
 */
export function getSignalLabel(item = {}, providerKey = "aws") {
    const rawType = (item.type || item.source || item.category || "").toLowerCase();
    const prov = (providerKey || "aws").toLowerCase();

    if (prov === "aws") {
        if (rawType.includes("trace") || rawType.includes("slow api") || rawType.includes("span")) return "X-Ray Trace";
        if (rawType.includes("log") || rawType.includes("error") || rawType.includes("exception")) return "CloudWatch Log";
        if (rawType.includes("metric") || rawType.includes("latency") || rawType.includes("cpu") || rawType.includes("memory")) return "CloudWatch Metric";
        if (rawType.includes("dep") || rawType.includes("topology") || rawType.includes("graph")) return "X-Ray Service Graph";
        if (rawType.includes("alert") || rawType.includes("alarm")) return "CloudWatch Alarm";
        if (rawType.includes("hist")) return "Historical Match";
    } else if (prov === "signoz") {
        if (rawType.includes("trace") || rawType.includes("span")) return "SigNoz Trace";
        if (rawType.includes("log")) return "SigNoz Log";
        if (rawType.includes("metric")) return "SigNoz Metric";
        if (rawType.includes("dep")) return "SigNoz Service Map";
        if (rawType.includes("alert")) return "SigNoz Alert";
    } else if (prov === "opentelemetry") {
        if (rawType.includes("trace") || rawType.includes("span")) return "OTel Trace Span";
        if (rawType.includes("log")) return "OTel Log Record";
        if (rawType.includes("metric")) return "OTel Metric DataPoint";
    } else if (prov === "mock") {
        if (rawType.includes("trace")) return "Synthetic Trace";
        if (rawType.includes("log")) return "Synthetic Log";
        if (rawType.includes("metric")) return "Synthetic Metric";
        if (rawType.includes("dep")) return "Synthetic Dependency";
        if (rawType.includes("alert")) return "Synthetic Alert";
        if (rawType.includes("hist")) return "Synthetic Historical Match";
    }

    return item.title || item.type || "Investigation Evidence";
}

/**
 * Resolve Human Review Status and corresponding wording for root causes / hypotheses.
 */
export function resolveReviewStatus(investigation = {}) {
    const report = investigation?.report || investigation?.final_report || {};
    const status = (
        investigation?.review_status
        || report?.review_status
        || investigation?.human_review?.review_status
        || investigation?.review_decision?.status
        || "PENDING_REVIEW"
    ).toUpperCase();

    const isPending = status === "PENDING_REVIEW" || status === "PENDING";
    const isAccepted = status === "ACCEPTED";
    const isRejected = status === "REJECTED";
    const isEscalated = status === "ESCALATED";

    let primaryLabel = "Primary Hypothesis";
    let panelTitle = "Root Cause Analysis & Candidate Hypotheses";
    let aiConclusionsHeading = "AI Candidate Hypotheses";

    if (isAccepted) {
        primaryLabel = "Reviewed Root Cause";
        panelTitle = "Reviewed Root Cause Analysis";
        aiConclusionsHeading = "Accepted Investigation Conclusions";
    } else if (isRejected) {
        primaryLabel = "Rejected Hypothesis";
        panelTitle = "Root Cause Analysis (Rejected)";
        aiConclusionsHeading = "Rejected Candidate Hypotheses";
    } else if (isEscalated) {
        primaryLabel = "Escalated for Review";
        panelTitle = "Root Cause Analysis (Escalated)";
        aiConclusionsHeading = "Escalated Candidate Hypotheses";
    } else {
        primaryLabel = "Primary Hypothesis";
        panelTitle = "Root Cause Analysis & Hypotheses";
        aiConclusionsHeading = "AI Candidate Hypotheses (Pending Review)";
    }

    return {
        status,
        isPending,
        isAccepted,
        isRejected,
        isEscalated,
        primaryLabel,
        panelTitle,
        aiConclusionsHeading
    };
}

/**
 * Canonical 8-Stage Investigation Pipeline Definition.
 * This order is authoritative across the visual pipeline and the timeline.
 */
export const CANONICAL_STAGES = [
    {
        stageNumber: 1,
        key: "trace",
        name: "Trace Agent",
        icon: "pi pi-search",
        description: "Distributed spans & latency anomalies",
        unit: "spans",
        keywords: ["trace", "span", "xray", "x-ray"]
    },
    {
        stageNumber: 2,
        key: "logs",
        name: "Logs Agent",
        icon: "pi pi-file-o",
        description: "Structured errors & stack traces",
        unit: "logs",
        keywords: ["log", "logs", "cloudwatch log", "error"]
    },
    {
        stageNumber: 3,
        key: "metrics",
        name: "Metrics Agent",
        icon: "pi pi-chart-line",
        description: "CPU, memory & throughput anomalies",
        unit: "metrics",
        keywords: ["metric", "metrics", "cloudwatch metric", "cpu", "latency"]
    },
    {
        stageNumber: 4,
        key: "dependency",
        name: "Dependency Agent",
        icon: "pi pi-sitemap",
        description: "Service topology & blast radius",
        unit: "dependencies",
        keywords: ["dependency", "dependencies", "topology", "service map"]
    },
    {
        stageNumber: 5,
        key: "alert",
        name: "Alert Agent",
        icon: "pi pi-bell",
        description: "Active threshold & SLO alerts",
        unit: "alerts",
        keywords: ["alert", "alerts", "alarm", "alarms", "slo"]
    },
    {
        stageNumber: 6,
        key: "historical",
        name: "Historical Agent",
        icon: "pi pi-history",
        description: "Prior incident pattern recall",
        unit: "matches",
        keywords: ["historical", "history", "memory", "prior incident", "investigation memory"]
    },
    {
        stageNumber: 7,
        key: "correlation",
        name: "Evidence Correlation",
        icon: "pi pi-sliders-h",
        description: "Cross-signal temporal correlation",
        unit: "correlations",
        keywords: ["correlation", "correlations", "correlate", "cross-signal"]
    },
    {
        stageNumber: 8,
        key: "reasoning",
        name: "AI Reasoning",
        icon: "pi pi-bolt",
        description: "Amazon Bedrock AI reasoning",
        unit: "hypotheses",
        keywords: ["reasoning", "bedrock", "synthesis", "ai reasoning", "hypothesis", "investigation engine"]
    }
];

/**
 * Maps any raw timeline string or event object to a canonical stage rank (1..8, or 9 for completion).
 */
export function getCanonicalStageRank(event) {
    if (!event) return 99;

    // If event has an explicit stage number
    if (typeof event === "object" && event !== null) {
        if (Number.isInteger(event.stage) && event.stage >= 1 && event.stage <= 8) {
            return event.stage;
        }
        if (Number.isInteger(event.step) && event.step >= 1 && event.step <= 8) {
            return event.step;
        }
    }

    const text = (typeof event === "string" ? event : (event.message || event.description || event.title || event.agent || "")).toLowerCase();

    // Check canonical stages in order
    for (const stage of CANONICAL_STAGES) {
        for (const kw of stage.keywords) {
            if (text.includes(kw)) {
                return stage.stageNumber;
            }
        }
    }

    if (text.includes("report") || text.includes("final")) {
        return 9;
    }

    return 50;
}
