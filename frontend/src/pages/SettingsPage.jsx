import React, { useState, useEffect, useCallback } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";

import telemetryService from "../services/telemetryService";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Telemetry");

    // Provider state
    const [selectedProvider, setSelectedProvider] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [activeProvider, setActiveProvider] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [telemetryMode, setTelemetryMode] = useState("live");
    const [awsRegion, setAwsRegion] = useState("us-east-1");
    const [awsBackend] = useState("CloudWatch + X-Ray");

    // Live provider test state
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [lastVerified, setLastVerified] = useState(null);

    // Feedback message
    const [saveSuccess, setSaveSuccess] = useState(false);

    const providerDropdownOptions = [
        { label: "AWS Observability (CloudWatch / X-Ray)", value: "aws" },
        { label: "SigNoz", value: "signoz" },
        { label: "OpenTelemetry-compatible Backend", value: "opentelemetry" },
        { label: "Mock / Demo", value: "mock" }
    ];

    const modeOptions = [
        { label: "Live Telemetry", value: "live" },
        { label: "Deterministic Simulation (Demo)", value: "demo" }
    ];

    const regionOptions = [
        { label: "US East (N. Virginia) — us-east-1", value: "us-east-1" },
        { label: "US East (Ohio) — us-east-2", value: "us-east-2" },
        { label: "US West (Oregon) — us-west-2", value: "us-west-2" },
        { label: "Europe (Ireland) — eu-west-1", value: "eu-west-1" },
        { label: "Asia Pacific (Mumbai) — ap-south-1", value: "ap-south-1" }
    ];

    const runConnectivityTest = useCallback(async (prov = selectedProvider, reg = awsRegion) => {
        setIsTesting(true);
        try {
            const res = await telemetryService.testProviderConnection({
                provider: prov,
                region: reg
            });
            setTestResult(res);
            setLastVerified(new Date().toLocaleTimeString());
        } catch (err) {
            setTestResult({
                connected: false,
                provider: prov,
                message: `Connection test error: ${err.message || "Endpoint unavailable"}`,
                capabilities: [],
                mode: prov === "mock" ? "DEMO" : "LIVE"
            });
            setLastVerified(new Date().toLocaleTimeString());
        } finally {
            setIsTesting(false);
        }
    }, [selectedProvider, awsRegion]);

    useEffect(() => {
        runConnectivityTest(selectedProvider, awsRegion);
    }, [selectedProvider, awsRegion, runConnectivityTest]);

    const handleSaveChanges = () => {
        telemetryService.setActiveProvider(selectedProvider);
        setActiveProvider(selectedProvider);
        setSaveSuccess(true);
        window.dispatchEvent(new CustomEvent("tattvaai:provider-changed", { detail: { provider: selectedProvider } }));
        setTimeout(() => setSaveSuccess(false), 4000);
    };

    const cloudWatchConsoleUrl = `https://${awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${awsRegion}`;
    const xrayConsoleUrl = `https://${awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${awsRegion}#xray:traces`;

    const getStatusDisplay = () => {
        if (isTesting) {
            return { label: "CHECKING...", severity: "info", icon: "pi pi-spin pi-spinner" };
        }
        if (selectedProvider === "mock") {
            return { label: "DEMO / READY", severity: "warning", icon: "pi pi-box" };
        }
        if (testResult?.connected) {
            return { label: "LIVE", severity: "success", icon: "pi pi-wifi" };
        }
        if (testResult && !testResult.connected) {
            return { label: "UNAVAILABLE", severity: "danger", icon: "pi pi-times" };
        }
        return { label: "LIVE", severity: "success", icon: "pi pi-wifi" };
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="settings-container">
            {/* Page Header */}
            <div className="page-title-row">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Configure telemetry providers, regions, and application preferences.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="clean-tabs-row">
                {["Telemetry", "Application", "Notifications", "Account", "Security"].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={`clean-tab-item ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {saveSuccess && (
                <div className="mb-4">
                    <Message 
                        severity="success" 
                        text="Settings saved successfully. Active telemetry provider updated." 
                        className="w-full"
                    />
                </div>
            )}

            {/* TAB: Telemetry */}
            {activeTab === "Telemetry" && (
                <>
                    {/* Card 1: Telemetry Provider Settings */}
                    <div className="clean-card mb-4">
                        <div className="card-header-clean">
                            <div className="card-header-title-group">
                                <div className="card-icon-badge">
                                    <i className="pi pi-database"></i>
                                </div>
                                <div>
                                    <h2 className="card-header-title">Telemetry Provider Configuration</h2>
                                    <p className="card-header-subtitle">
                                        Select and configure the observability provider for TattvaAI's investigation pipeline.
                                    </p>
                                </div>
                            </div>
                            <div className="flex align-items-center gap-2">
                                <Tag
                                    value={statusDisplay.label}
                                    severity={statusDisplay.severity}
                                    icon={statusDisplay.icon}
                                    className="font-bold text-xs px-2 py-1"
                                />
                            </div>
                        </div>

                        {/* Two-Column Configuration Form */}
                        <div className="two-col-grid">
                            <div className="form-field-group">
                                <label className="form-field-label">Telemetry Provider</label>
                                <Dropdown
                                    value={selectedProvider}
                                    options={providerDropdownOptions}
                                    onChange={(e) => setSelectedProvider(e.value)}
                                    placeholder="Select Telemetry Provider"
                                    className="w-full"
                                />
                                <span className="form-field-helper">
                                    Provide distributed traces, logs, metrics, alerts and service dependencies.
                                </span>
                            </div>

                            <div className="form-field-group">
                                <label className="form-field-label">Mode</label>
                                <Dropdown
                                    value={telemetryMode}
                                    options={modeOptions}
                                    onChange={(e) => setTelemetryMode(e.value)}
                                    placeholder="Select Telemetry Mode"
                                    className="w-full"
                                />
                                <span className="form-field-helper">
                                    Use live data from your AWS environment or deterministic simulation.
                                </span>
                            </div>

                            <div className="form-field-group">
                                <label className="form-field-label">AWS Region</label>
                                <Dropdown
                                    value={awsRegion}
                                    options={regionOptions}
                                    onChange={(e) => setAwsRegion(e.value)}
                                    placeholder="Select AWS Region"
                                    className="w-full"
                                />
                                <span className="form-field-helper">
                                    The AWS region to fetch telemetry data from.
                                </span>
                            </div>

                            <div className="form-field-group">
                                <label className="form-field-label">Observability Stack</label>
                                <InputText
                                    value={awsBackend}
                                    disabled
                                    className="w-full"
                                    style={{ background: "#F8FAFC" }}
                                />
                                <span className="form-field-helper">
                                    Unified AWS CloudWatch Logs/Metrics + AWS X-Ray Tracing.
                                </span>
                            </div>
                        </div>

                        {/* Live Backend Provider Status & Real Data Details */}
                        <div className="surface-ground border-1 surface-border border-round p-3 mt-3">
                            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom-1 surface-border">
                                <div>
                                    <div className="font-bold text-sm text-900 flex align-items-center gap-2">
                                        <i className="pi pi-server text-primary"></i>
                                        <span>Backend Provider Verification</span>
                                    </div>
                                    <div className="text-xs text-500 mt-1">
                                        {testResult?.message || "Validating provider status via backend..."}
                                    </div>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <Button
                                        label={isTesting ? "Testing..." : "Test Connection"}
                                        icon="pi pi-bolt"
                                        size="small"
                                        outlined
                                        loading={isTesting}
                                        onClick={() => runConnectivityTest(selectedProvider, awsRegion)}
                                    />
                                </div>
                            </div>

                            {/* Structured 2-Column Grid of Actual Provider State */}
                            <div className="grid text-xs">
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">Telemetry Provider:</span>
                                    <span className="font-semibold text-800 text-sm">
                                        {selectedProvider === "aws" ? "AWS Observability" :
                                         selectedProvider === "signoz" ? "SigNoz Observability" :
                                         selectedProvider === "opentelemetry" ? "OpenTelemetry Backend" : "Mock / Demo"}
                                    </span>
                                </div>
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">Mode:</span>
                                    <span className="font-semibold text-800 text-sm">
                                        {selectedProvider === "mock" ? "Simulation (Demo)" : "Live Telemetry"}
                                    </span>
                                </div>
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">AWS Region:</span>
                                    <span className="font-mono font-semibold text-800 text-sm">{awsRegion}</span>
                                </div>
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">Observability Stack:</span>
                                    <span className="font-semibold text-800 text-sm">CloudWatch + X-Ray</span>
                                </div>
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">Connection Status:</span>
                                    <span className="font-bold text-sm flex align-items-center gap-1">
                                        <Tag
                                            value={statusDisplay.label}
                                            severity={statusDisplay.severity}
                                            className="text-xs px-2 py-0"
                                        />
                                    </span>
                                </div>
                                <div className="col-12 sm:col-6 md:col-4 py-1">
                                    <span className="text-500 font-medium block">Last Verified:</span>
                                    <span className="font-mono text-700 text-sm">{lastVerified || "Just now"}</span>
                                </div>
                            </div>

                            {/* Supported Capabilities */}
                            <div className="pt-3 mt-2 border-top-1 surface-border">
                                <span className="text-500 font-medium text-xs mr-2">Active Capabilities:</span>
                                <div className="inline-flex flex-wrap gap-1 mt-1">
                                    {["Traces", "Logs", "Metrics", "Alerts", "Dependencies"].map((cap) => (
                                        <span key={cap} className="surface-100 text-700 text-xs px-2 py-1 border-round font-medium">
                                            {cap}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Genuine AWS Console Navigation Links */}
                        <div className="mt-3 pt-3 border-top-1 surface-border flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2">
                            <span className="text-xs text-500">
                                Open AWS Console in region <span className="font-mono font-bold text-700">{awsRegion}</span>:
                            </span>
                            <div className="flex gap-2">
                                <a
                                    href={cloudWatchConsoleUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none" }}
                                >
                                    <Button
                                        label="CloudWatch Console"
                                        icon="pi pi-external-link"
                                        size="small"
                                        text
                                        className="p-button-sm text-xs"
                                    />
                                </a>
                                <a
                                    href={xrayConsoleUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none" }}
                                >
                                    <Button
                                        label="X-Ray Traces Console"
                                        icon="pi pi-external-link"
                                        size="small"
                                        text
                                        className="p-button-sm text-xs"
                                    />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: AWS IAM Configuration */}
                    <div className="clean-card mb-4">
                        <div className="card-header-clean">
                            <div className="card-header-title-group">
                                <div className="card-icon-badge">
                                    <i className="pi pi-shield"></i>
                                </div>
                                <div>
                                    <h2 className="card-header-title">AWS IAM Security & Credentials</h2>
                                    <p className="card-header-subtitle">
                                        Serverless IAM role execution management.
                                    </p>
                                </div>
                            </div>
                            <div className="status-pill status-pill-success">
                                <i className="pi pi-lock" style={{ fontSize: "0.75rem" }}></i>
                                <span>Zero Secrets Exposed</span>
                            </div>
                        </div>

                        {/* IAM Security Callout Box */}
                        <div className="callout-box-blue" style={{ marginTop: 0 }}>
                            <div className="flex align-items-center gap-3">
                                <div className="card-icon-badge" style={{ width: "32px", height: "32px", fontSize: "0.95rem" }}>
                                    <i className="pi pi-key"></i>
                                </div>
                                <div>
                                    <div className="callout-box-title">IAM Execution Role</div>
                                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                        Managed via AWS Lambda Execution Role. No access keys, secret keys, or credentials are exposed in the frontend.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Changes Button Row */}
                    <div className="flex justify-content-end mb-4">
                        <Button
                            label="Save Changes"
                            icon="pi pi-save"
                            onClick={handleSaveChanges}
                            className="btn-primary"
                        />
                    </div>
                </>
            )}

            {/* TAB: Application */}
            {activeTab === "Application" && (
                <div className="clean-card">
                    <div className="card-header-clean">
                        <div className="card-header-title-group">
                            <div className="card-icon-badge">
                                <i className="pi pi-sliders-h"></i>
                            </div>
                            <div>
                                <h2 className="card-header-title">Application Preferences</h2>
                                <p className="card-header-subtitle">Customize investigation timeout, refresh frequency, and display density.</p>
                            </div>
                        </div>
                    </div>
                    <div className="two-col-grid">
                        <div className="form-field-group">
                            <label className="form-field-label">Investigation Polling Frequency</label>
                            <InputText defaultValue="10 seconds" disabled />
                        </div>
                        <div className="form-field-group">
                            <label className="form-field-label">Correlation Confidence Threshold</label>
                            <InputText defaultValue="70%" disabled />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Notifications */}
            {activeTab === "Notifications" && (
                <div className="clean-card">
                    <div className="card-header-clean">
                        <div className="card-header-title-group">
                            <div className="card-icon-badge">
                                <i className="pi pi-bell"></i>
                            </div>
                            <div>
                                <h2 className="card-header-title">Notification Channels</h2>
                                <p className="card-header-subtitle">Configure SRE alert webhooks and escalation routes.</p>
                            </div>
                        </div>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        Active alert integration connects via AWS SNS topic and CloudWatch Alarm subscriptions.
                    </p>
                </div>
            )}

            {/* TAB: Account & Security */}
            {(activeTab === "Account" || activeTab === "Security") && (
                <div className="clean-card">
                    <div className="card-header-clean">
                        <div className="card-header-title-group">
                            <div className="card-icon-badge">
                                <i className="pi pi-user"></i>
                            </div>
                            <div>
                                <h2 className="card-header-title">{activeTab} Details</h2>
                                <p className="card-header-subtitle">Cryptographic JWT token session management.</p>
                            </div>
                        </div>
                        <div className="status-pill status-pill-success">
                            <i className="pi pi-shield"></i>
                            <span>JWT Verified (7d)</span>
                        </div>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        Operator sessions are authenticated with HMAC-SHA256 signatures issued by AWS API Gateway and verified against DynamoDB user partitions.
                    </p>
                </div>
            )}
        </div>
    );
}