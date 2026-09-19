import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { Chip } from "primereact/chip";
import { Divider } from "primereact/divider";
import { resolveTelemetryContext } from "../../utils/telemetryContext";

export default function InvestigationHeader({ investigation = {} }) {
    const report = investigation?.report || investigation?.final_report || {};
    const incident = investigation?.incident || {};
    const invId = investigation.investigation_id || investigation.id || investigation.incident_id || "N/A";
    const incId = investigation.incident_id || report.incident_id || invId;

    const telemetryCtx = resolveTelemetryContext(investigation);
    const providerInfo = telemetryCtx.provider;
    const isLive = telemetryCtx.isLive;
    const environment = telemetryCtx.environment;
    const serviceName = investigation.service_name || incident.service_name || report.service_name || "";

    const displayTitle = (investigation.title && investigation.title !== "Unknown Incident")
        ? investigation.title
        : (report.title && report.title !== "Unknown Incident")
            ? report.title
            : (serviceName
                ? `Incident Investigation: ${serviceName.replace(/[-_]/g, ' ').toUpperCase()} Service`
                : `Investigation ${invId}`);

    const displayStatus = (investigation.status && investigation.status !== "UNKNOWN")
        ? investigation.status
        : (report.status && report.status !== "UNKNOWN")
            ? report.status
            : "COMPLETED";

    const displaySeverity = (investigation.severity && investigation.severity !== "UNKNOWN")
        ? investigation.severity
        : (report.severity || "LOW");

    const getSeverityInfo = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return { severity: 'danger', icon: 'pi pi-exclamation-triangle' };
            case 'HIGH':
                return { severity: 'warning', icon: 'pi pi-exclamation-circle' };
            case 'MEDIUM':
                return { severity: 'info', icon: 'pi pi-info-circle' };
            case 'LOW':
                return { severity: 'success', icon: 'pi pi-check-circle' };
            default:
                return { severity: 'secondary', icon: 'pi pi-circle' };
        }
    };

    const getStatusInfo = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED':
            case 'RESOLVED':
                return { severity: 'success', icon: 'pi pi-check' };
            case 'RUNNING':
            case 'IN_PROGRESS':
                return { severity: 'info', icon: 'pi pi-spin pi-spinner' };
            case 'FAILED':
                return { severity: 'danger', icon: 'pi pi-times' };
            default:
                return { severity: 'secondary', icon: 'pi pi-circle' };
        }
    };

    const severityInfo = getSeverityInfo(displaySeverity);
    const statusInfo = getStatusInfo(displayStatus);
    
    const confidence = investigation.confidence ?? report.confidence ?? 0;
    const confidenceColor = confidence >= 90 ? 'success' : confidence >= 70 ? 'warning' : 'danger';

    return (
        <Card className="investigation-header-card mb-4">
            <div className="flex flex-column gap-3">
                {/* Main Title */}
                <div>
                    <h1 className="text-2xl font-bold text-900 m-0 mb-2">
                        {displayTitle}
                    </h1>
                    {(investigation.description || report.executive_summary) && (
                        <p className="text-600 m-0 line-height-3">
                            {investigation.description || report.executive_summary}
                        </p>
                    )}
                </div>

                <Divider className="my-2" />

                {/* Investigation Metadata */}
                <div className="grid">
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Investigation ID</label>
                            <Chip 
                                label={invId}
                                icon="pi pi-hashtag"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    {incId && (
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="field">
                                <label className="block text-600 font-medium mb-1">Incident ID</label>
                                <Chip 
                                    label={incId}
                                    icon="pi pi-exclamation-triangle"
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    )}

                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Severity</label>
                            <Tag 
                                value={displaySeverity}
                                severity={severityInfo.severity}
                                icon={severityInfo.icon}
                                className="font-semibold"
                            />
                        </div>
                    </div>

                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Status</label>
                            <Tag 
                                value={displayStatus}
                                severity={statusInfo.severity}
                                icon={statusInfo.icon}
                                className="font-semibold"
                            />
                        </div>
                    </div>

                    {/* Telemetry Source Provider */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Telemetry Provider</label>
                            <Tag
                                value={providerInfo.label}
                                icon={providerInfo.icon}
                                severity={providerInfo.severity}
                                className="font-semibold"
                            />
                        </div>
                    </div>

                    {/* Telemetry Mode */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Data Source Mode</label>
                            <Tag
                                value={isLive ? "LIVE TELEMETRY" : "SYNTHETIC / DEMO"}
                                icon={isLive ? "pi pi-wifi" : "pi pi-box"}
                                severity={isLive ? "success" : "warning"}
                                className="font-bold"
                            />
                        </div>
                    </div>

                    {/* Environment */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Environment</label>
                            <Chip
                                label={environment}
                                icon="pi pi-compass"
                            />
                        </div>
                    </div>

                    {/* Target Service (if any) */}
                    {serviceName && (
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="field">
                                <label className="block text-600 font-medium mb-1">Target Service</label>
                                <Chip
                                    label={serviceName}
                                    icon="pi pi-server"
                                    className="font-bold"
                                />
                            </div>
                        </div>
                    )}

                    {/* Confidence Score */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="field">
                            <label className="block text-600 font-medium mb-1">Confidence Score</label>
                            <div className="flex align-items-center gap-2">
                                <ProgressBar 
                                    value={confidence}
                                    className="flex-1"
                                    color={
                                        confidenceColor === 'success' ? '#22c55e' :
                                        confidenceColor === 'warning' ? '#f59e0b' : '#ef4444'
                                    }
                                />
                                <span className={`font-bold ${
                                    confidenceColor === 'success' ? 'text-green-600' :
                                    confidenceColor === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                    {confidence}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Timestamps */}
                    {investigation.created_at && (
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="field">
                                <label className="block text-600 font-medium mb-1">Created</label>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-calendar text-500"></i>
                                    <span className="text-700">
                                        {new Date(investigation.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {investigation.updated_at && (
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="field">
                                <label className="block text-600 font-medium mb-1">Last Updated</label>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-clock text-500"></i>
                                    <span className="text-700">
                                        {new Date(investigation.updated_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {investigation.duration && (
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="field">
                                <label className="block text-600 font-medium mb-1">Duration</label>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-stopwatch text-500"></i>
                                    <span className="text-700">{investigation.duration}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}