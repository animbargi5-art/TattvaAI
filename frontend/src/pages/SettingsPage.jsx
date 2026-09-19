import React, { useState, useEffect, useCallback } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

import telemetryService from "../services/telemetryService";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Telemetry");

    // Provider state
    const [selectedProvider, setSelectedProvider] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [activeProvider, setActiveProvider] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [telemetryMode, setTelemetryMode] = useState("live");
    const [awsRegion, setAwsRegion] = useState("us-east-1");
    const [awsBackend] = useState("CloudWatch & X-Ray (Unified)");

    // SigNoz & Otel parameters (preserved for full capability)
    const [signozEndpoint, setSignozEndpoint] = useState(import.meta.env.VITE_SIGNOZ_URL || "http://localhost:3301");
    const [signozQueryEndpoint, setSignozQueryEndpoint] = useState("http://localhost:3301/api/v1");

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

    const handleSaveChanges = () => {
        telemetryService.setActiveProvider(selectedProvider);
        setActiveProvider(selectedProvider);
        setSaveSuccess(true);
        window.dispatchEvent(new CustomEvent("tattvaai:provider-changed", { detail: { provider: selectedProvider } }));
        setTimeout(() => setSaveSuccess(false), 4000);
    };

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
                    <div className="clean-card">
                        <div className="card-header-clean">
                            <div className="card-header-title-group">
                                <div className="card-icon-badge">
                                    <i className="pi pi-database"></i>
                                </div>
                                <div>
                                    <h2 className="card-header-title">Telemetry Provider Settings</h2>
                                    <p className="card-header-subtitle">
                                        Select and configure the observability provider for TattvaAI's investigation pipeline.
                                    </p>
                                </div>
                            </div>
                            <div className="status-pill status-pill-success">
                                <span className="status-dot-green"></span>
                                <span>Active Source: AWS Observability</span>
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
                                    Use live data from your AWS environment.
                                </span>
                            </div>

                            <div className="form-field-group">
                                <label className="form-field-label">AWS Region</label>
                                <Dropdown
                                    value={awsRegion}
                                    options={regionOptions}
                                    onChange={(e) => setAwsRegion(e.target.value)}
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
                                    Default stack for AWS observability.
                                </span>
                            </div>
                        </div>

                        {/* Informational Callout Box */}
                        <div className="callout-box-blue">
                            <div className="callout-box-header">
                                <i className="pi pi-info-circle text-primary" style={{ fontSize: "1.05rem" }}></i>
                                <span className="callout-box-title">AWS Observability</span>
                            </div>
                            <p className="callout-box-desc">
                                AWS CloudWatch metrics/logs and AWS X-Ray distributed traces via IAM credentials.
                            </p>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500, marginRight: "0.5rem" }}>
                                    Supported Capabilities:
                                </span>
                                <div className="callout-chip-row" style={{ display: "inline-flex" }}>
                                    {["traces", "logs", "metrics", "alerts", "dependencies"].map((cap) => (
                                        <span key={cap} className="clean-chip">{cap}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: AWS IAM Configuration */}
                    <div className="clean-card">
                        <div className="card-header-clean">
                            <div className="card-header-title-group">
                                <div className="card-icon-badge">
                                    <i className="pi pi-shield"></i>
                                </div>
                                <div>
                                    <h2 className="card-header-title">AWS IAM Configuration</h2>
                                    <p className="card-header-subtitle">
                                        Manage the IAM role used to access AWS observability services.
                                    </p>
                                </div>
                            </div>
                            <div className="status-pill status-pill-info">
                                <i className="pi pi-lock" style={{ fontSize: "0.75rem" }}></i>
                                <span>Managed Securely</span>
                            </div>
                        </div>

                        {/* IAM Security Callout Box */}
                        <div className="callout-box-blue" style={{ marginTop: 0 }}>
                            <div className="flex align-items-center gap-3">
                                <div className="card-icon-badge" style={{ width: "32px", height: "32px", fontSize: "0.95rem" }}>
                                    <i className="pi pi-key"></i>
                                </div>
                                <div>
                                    <div className="callout-box-title">IAM Credentials</div>
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
                            <span>JWT Verified (24h)</span>
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