import React, { useState, useEffect, useCallback } from "react";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

import telemetryService from "../services/telemetryService";
import "../styles/settings-page.css";

export default function SettingsPage() {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://eodackuif2.execute-api.us-east-1.amazonaws.com";

    // Telemetry Provider state
    const [selectedProvider, setSelectedProvider] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [activeProvider, setActiveProviderState] = useState(() => telemetryService.getActiveProvider() || "aws");
    const [providersList, setProvidersList] = useState([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(true);

    // Endpoints and parameters
    const [signozEndpoint, setSignozEndpoint] = useState(import.meta.env.VITE_SIGNOZ_URL || "http://localhost:3301");
    const [signozQueryEndpoint, setSignozQueryEndpoint] = useState("http://localhost:3301/api/v1");
    const [otelQueryEndpoint, setOtelQueryEndpoint] = useState("");
    const [otelProtocol, setOtelProtocol] = useState("HTTP / REST (PromQL / Trace Query)");
    const [otelService, setOtelService] = useState("payment-service");
    const [awsRegion, setAwsRegion] = useState("us-east-1");
    const [awsBackend] = useState("CloudWatch & X-Ray (Unified)");

    // Connection testing state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Status map for all 4 providers
    const [providersStatus, setProvidersStatus] = useState({
        aws: { status: "checking", connected: true, mode: "LIVE" },
        mock: { status: "checking", connected: true, mode: "DEMO" },
        signoz: { status: "checking", connected: false, mode: "LIVE" },
        opentelemetry: { status: "checking", connected: false, mode: "LIVE" },
    });

    const providerDropdownOptions = [
        { label: "AWS Observability (CloudWatch / X-Ray)", value: "aws", icon: "pi pi-cloud" },
        { label: "SigNoz", value: "signoz", icon: "pi pi-chart-line" },
        { label: "OpenTelemetry-compatible Backend", value: "opentelemetry", icon: "pi pi-share-alt" },
        { label: "Mock / Demo", value: "mock", icon: "pi pi-box" },
    ];

    const regionOptions = [
        { label: "US East (N. Virginia) — us-east-1", value: "us-east-1" },
        { label: "US East (Ohio) — us-east-2", value: "us-east-2" },
        { label: "US West (Oregon) — us-west-2", value: "us-west-2" },
        { label: "Europe (Ireland) — eu-west-1", value: "eu-west-1" },
        { label: "Asia Pacific (Mumbai) — ap-south-1", value: "ap-south-1" },
    ];

    // Fetch providers catalog from backend GET /telemetry/providers
    const loadProviders = useCallback(async () => {
        setIsLoadingProviders(true);
        try {
            const data = await telemetryService.getProviders();
            if (data?.providers) {
                setProvidersList(data.providers);
            }
        } catch (err) {
            console.warn("Failed to load providers list:", err);
        } finally {
            setIsLoadingProviders(false);
        }
    }, []);

    // Test connection for a specific provider
    const testProvider = useCallback(async (providerId, customConfig = {}) => {
        const config = {
            provider: providerId,
            endpoint: providerId === "signoz" ? signozEndpoint : undefined,
            query_endpoint: providerId === "signoz" ? signozQueryEndpoint : providerId === "opentelemetry" ? otelQueryEndpoint : undefined,
            region: providerId === "aws" ? awsRegion : undefined,
            service_name: providerId === "opentelemetry" ? otelService : undefined,
            ...customConfig
        };

        try {
            return await telemetryService.testProviderConnection(config);
        } catch (err) {
            return {
                connected: false,
                provider: providerId,
                message: err.message || "Failed to reach telemetry test endpoint",
                capabilities: [],
                mode: providerId === "mock" ? "DEMO" : "LIVE"
            };
        }
    }, [signozEndpoint, signozQueryEndpoint, otelQueryEndpoint, awsRegion, otelService]);

    // Handle Manual Test Connection for selected provider
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        const result = await testProvider(selectedProvider);
        setTestResult(result);
        setProvidersStatus(prev => ({
            ...prev,
            [selectedProvider]: {
                status: "checked",
                connected: result.connected,
                mode: result.mode
            }
        }));
        setIsTesting(false);
    };

    // Set as active provider
    const handleSetActiveProvider = (providerId) => {
        telemetryService.setActiveProvider(providerId);
        setActiveProviderState(providerId);
        setSelectedProvider(providerId);
    };

    // Load providers and initial health checks on mount
    useEffect(() => {
        loadProviders();

        // Initial test of selected provider
        const initialTest = async () => {
            setIsTesting(true);
            const res = await testProvider(selectedProvider);
            setTestResult(res);
            setProvidersStatus(prev => ({
                ...prev,
                [selectedProvider]: {
                    status: "checked",
                    connected: res.connected,
                    mode: res.mode
                }
            }));
            setIsTesting(false);
        };
        initialTest();
    }, [loadProviders, selectedProvider, testProvider]);

    // Current selected provider details from list
    const currentProviderInfo = providersList.find(p => p.id === selectedProvider) || {
        id: selectedProvider,
        name: selectedProvider === "aws" ? "AWS Observability" :
              selectedProvider === "signoz" ? "SigNoz" :
              selectedProvider === "opentelemetry" ? "OpenTelemetry-compatible Backend" : "Mock / Demo",
        description: selectedProvider === "aws" ? "AWS CloudWatch metrics/logs and AWS X-Ray distributed traces via IAM credentials." :
                     selectedProvider === "signoz" ? "Live query backend for SigNoz traces, metrics, logs, and service maps." :
                     selectedProvider === "opentelemetry" ? "OpenTelemetry read/query backend for standards-compliant observability backends." :
                     "Deterministic synthetic demo telemetry for reliable offline testing and showcase.",
        mode: selectedProvider === "mock" ? "DEMO" : "LIVE",
        capabilities: selectedProvider === "mock"
            ? ["traces", "logs", "metrics", "dependencies", "alerts", "historical_incidents"]
            : selectedProvider === "aws"
            ? ["traces", "logs", "metrics", "alerts", "dependencies"]
            : selectedProvider === "signoz"
            ? ["traces", "logs", "metrics", "dependencies", "alerts"]
            : ["traces", "logs", "metrics"]
    };

    return (
        <div className="settings-page p-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-4 gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-900 m-0 mb-1">Telemetry Provider Settings</h1>
                    <p className="text-600 m-0 text-sm">
                        Select and test observability providers powering TattvaAI's autonomous multi-agent investigation pipeline.
                    </p>
                </div>
                <div className="flex align-items-center gap-2">
                    <span className="text-xs font-semibold text-600">Active Source:</span>
                    <Tag
                        value={activeProvider === "aws" ? "AWS Observability" : activeProvider === "mock" ? "Mock / Demo" : activeProvider.toUpperCase()}
                        severity={activeProvider === "aws" ? "info" : activeProvider === "mock" ? "warning" : "success"}
                        icon={activeProvider === "aws" ? "pi pi-cloud" : activeProvider === "mock" ? "pi pi-box" : "pi pi-server"}
                        className="px-3 py-1 font-bold text-sm"
                    />
                </div>
            </div>

            {/* Central Provider Configuration Card */}
            <Card className="mb-4 shadow-1 border-1 surface-border">
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-3 gap-2">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-compass text-primary text-xl"></i>
                        <h2 className="text-xl font-bold text-900 m-0">Observability Provider Configuration</h2>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="text-xs text-600">Mode:</span>
                        <Tag
                            value={currentProviderInfo.mode === "LIVE" ? "LIVE TELEMETRY" : "DEMO SIMULATION"}
                            severity={currentProviderInfo.mode === "LIVE" ? "success" : "warning"}
                            className="font-bold text-xs"
                        />
                    </div>
                </div>

                <p className="text-600 text-sm mb-4 line-height-3">
                    Select a supported telemetry provider to supply distributed traces, application logs, metrics, active alerts,
                    and service dependencies to TattvaAI's 8 investigation agents.
                </p>

                {/* Provider Dropdown Selector */}
                <div className="field mb-4">
                    <label className="block text-800 font-semibold mb-2 text-sm">Select Telemetry Provider</label>
                    <Dropdown
                        value={selectedProvider}
                        options={providerDropdownOptions}
                        onChange={(e) => {
                            setSelectedProvider(e.value);
                            setTestResult(null);
                        }}
                        placeholder="Select Telemetry Provider"
                        className="w-full md:w-30rem"
                    />
                </div>

                {/* Provider Details Card */}
                <div className="surface-ground p-3 border-round mb-4 border-1 surface-border">
                    <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-2 gap-2">
                        <h3 className="text-base font-bold text-900 m-0 flex align-items-center gap-2">
                            <i className="pi pi-info-circle text-primary"></i>
                            {currentProviderInfo.name}
                        </h3>
                        {activeProvider === selectedProvider ? (
                            <Tag value="Active Investigation Source" severity="success" icon="pi pi-check" className="text-xs" />
                        ) : (
                            <Button
                                label="Set as Active Source"
                                icon="pi pi-check"
                                size="small"
                                className="p-button-sm p-button-outlined"
                                onClick={() => handleSetActiveProvider(selectedProvider)}
                            />
                        )}
                    </div>

                    <p className="text-700 text-sm m-0 mb-3 line-height-3">
                        {currentProviderInfo.description}
                    </p>

                    {/* Capabilities */}
                    <div className="mb-2">
                        <span className="text-xs font-semibold text-600 block mb-1">Supported Capabilities:</span>
                        <div className="flex flex-wrap gap-1">
                            {currentProviderInfo.capabilities?.map((cap) => (
                                <Chip key={cap} label={cap} className="text-xs py-0 px-2" />
                            ))}
                        </div>
                    </div>
                </div>

                <Divider className="my-3" />

                {/* Provider-Specific Configuration Fields */}
                {selectedProvider === "mock" && (
                    <div className="p-3 surface-ground border-round mb-4 border-1 surface-border">
                        <div className="flex align-items-center gap-2 mb-2">
                            <i className="pi pi-box text-orange-500"></i>
                            <h4 className="text-sm font-semibold m-0 text-900">Deterministic Demo Telemetry</h4>
                        </div>
                        <p className="text-600 text-xs m-0 mb-3 line-height-3">
                            Deterministic demo mode generates realistic microservice telemetry for safe offline testing,
                            demos, and competition evaluation without requiring external connections.
                        </p>
                    </div>
                )}

                {selectedProvider === "aws" && (
                    <div className="grid p-fluid mb-4">
                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">AWS Region</label>
                                <Dropdown
                                    value={awsRegion}
                                    options={regionOptions}
                                    onChange={(e) => setAwsRegion(e.target.value)}
                                    placeholder="Select AWS Region"
                                />
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">Observability Stack</label>
                                <InputText value={awsBackend} disabled />
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="flex align-items-center gap-2 text-600 text-xs mt-1 surface-ground p-2 border-round">
                                <i className="pi pi-shield text-blue-600 text-base"></i>
                                <span>
                                    <strong>AWS IAM Credentials:</strong> Managed securely via AWS Lambda Execution Role.
                                    No access keys, secret keys, or credentials are exposed in the frontend.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProvider === "signoz" && (
                    <div className="grid p-fluid mb-4">
                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">SigNoz UI / Service Endpoint</label>
                                <InputText
                                    value={signozEndpoint}
                                    onChange={(e) => setSignozEndpoint(e.target.value)}
                                    placeholder="http://localhost:3301"
                                />
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">Query / API Endpoint</label>
                                <InputText
                                    value={signozQueryEndpoint}
                                    onChange={(e) => setSignozQueryEndpoint(e.target.value)}
                                    placeholder="http://localhost:3301/api/v1"
                                />
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="flex align-items-center gap-2 text-600 text-xs mt-1 surface-ground p-2 border-round">
                                <i className="pi pi-lock text-green-600 text-base"></i>
                                <span>
                                    <strong>Credentials Security:</strong> SigNoz API tokens are resolved by backend environment / AWS Secrets Manager.
                                    Never exposed in the client browser.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProvider === "opentelemetry" && (
                    <div className="grid p-fluid mb-4">
                        <div className="col-12">
                            <Message
                                severity="warn"
                                text="Notice: OTLP is an ingestion protocol. A telemetry query/read API is required for investigation agents to retrieve evidence."
                                className="mb-3 w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">Telemetry Query / Read Endpoint</label>
                                <InputText
                                    value={otelQueryEndpoint}
                                    onChange={(e) => setOtelQueryEndpoint(e.target.value)}
                                    placeholder="https://otel-query.internal/v1"
                                />
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label className="text-800 font-medium text-sm">Query Protocol</label>
                                <InputText value={otelProtocol} disabled />
                            </div>
                        </div>
                    </div>
                )}

                {/* Connection Action & Status Feedback */}
                <div className="flex flex-wrap align-items-center gap-3 mb-3">
                    <Button
                        label={isTesting ? "Testing Connection..." : `Test ${currentProviderInfo.name} Connection`}
                        icon={isTesting ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
                        onClick={handleTestConnection}
                        loading={isTesting}
                        className="p-button-primary"
                    />
                    {testResult && (
                        <Tag
                            value={
                                testResult.connected
                                    ? (selectedProvider === "mock" ? "● Ready [DEMO]" : "● Connected [LIVE]")
                                    : (selectedProvider === "signoz" ? "● Not Verified / Not Connected" : "● Not Connected")
                            }
                            severity={testResult.connected ? "success" : "danger"}
                            icon={testResult.connected ? "pi pi-check-circle" : "pi pi-times-circle"}
                            className="text-sm px-3 py-1 font-semibold"
                        />
                    )}
                </div>

                {/* Test Result Message & Capabilities */}
                {testResult && (
                    <div className="surface-ground p-3 border-round border-1 surface-border">
                        <div className="flex align-items-start gap-2">
                            <i
                                className={`pi ${testResult.connected ? "pi-check-circle text-green-600" : "pi-exclamation-circle text-orange-600"} text-lg mt-1`}
                            ></i>
                            <div className="flex-1">
                                <p className="text-900 font-semibold m-0 text-sm">{testResult.message}</p>
                                {testResult.details && Object.keys(testResult.details).length > 0 && (
                                    <div className="text-xs text-600 mt-1">
                                        Details: {JSON.stringify(testResult.details)}
                                    </div>
                                )}
                                {testResult.capabilities && testResult.capabilities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        <span className="text-xs text-600 mr-2 self-center">Verified Capabilities:</span>
                                        {testResult.capabilities.map((cap) => (
                                            <Chip key={cap} label={cap} className="text-xs py-0 px-2" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* All Providers Reality Overview */}
            <Card className="mb-4 shadow-1 border-1 surface-border">
                <div className="flex align-items-center gap-2 mb-3">
                    <i className="pi pi-table text-primary text-xl"></i>
                    <h3 className="text-lg font-bold text-900 m-0">Telemetry Providers Architecture & Reality</h3>
                </div>
                <p className="text-600 text-xs mb-3">
                    Comparison of supported telemetry sources, verification status, and investigation agent capabilities.
                </p>

                <div className="grid">
                    {/* AWS Observability */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="p-3 border-1 surface-border border-round surface-card h-full flex flex-column justify-content-between">
                            <div>
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <span className="font-bold text-900 text-sm">AWS Observability</span>
                                    <Tag value="LIVE" severity="success" className="text-xs font-bold" />
                                </div>
                                <p className="text-600 text-xs m-0 mb-2">
                                    CloudWatch metrics & logs, AWS X-Ray traces, and service graph dependencies.
                                </p>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <Tag value="VERIFIED LIVE" severity="success" icon="pi pi-check" className="text-xs w-full" />
                                </div>
                                <div className="text-xs text-500">Auth: IAM Role</div>
                            </div>
                        </div>
                    </div>

                    {/* Mock / Demo */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="p-3 border-1 surface-border border-round surface-card h-full flex flex-column justify-content-between">
                            <div>
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <span className="font-bold text-900 text-sm">Mock / Demo</span>
                                    <Tag value="DEMO" severity="warning" className="text-xs font-bold" />
                                </div>
                                <p className="text-600 text-xs m-0 mb-2">
                                    Deterministic synthetic telemetry for reproducible offline simulation & evaluation.
                                </p>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <Tag value="VERIFIED DEMO" severity="warning" icon="pi pi-box" className="text-xs w-full" />
                                </div>
                                <div className="text-xs text-500">Auth: Synthetic Generator</div>
                            </div>
                        </div>
                    </div>

                    {/* SigNoz */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="p-3 border-1 surface-border border-round surface-card h-full flex flex-column justify-content-between">
                            <div>
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <span className="font-bold text-900 text-sm">SigNoz</span>
                                    <Tag value="LIVE" severity="info" className="text-xs font-bold" />
                                </div>
                                <p className="text-600 text-xs m-0 mb-2">
                                    Direct telemetry query API for SigNoz traces, logs, metrics, and service maps.
                                </p>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <Tag value="NOT VERIFIED LIVE" severity="danger" icon="pi pi-times" className="text-xs w-full" />
                                </div>
                                <div className="text-xs text-500">Requires SigNoz endpoint</div>
                            </div>
                        </div>
                    </div>

                    {/* OpenTelemetry */}
                    <div className="col-12 md:col-6 lg:col-3">
                        <div className="p-3 border-1 surface-border border-round surface-card h-full flex flex-column justify-content-between">
                            <div>
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <span className="font-bold text-900 text-sm">OpenTelemetry</span>
                                    <Tag value="LIVE" severity="info" className="text-xs font-bold" />
                                </div>
                                <p className="text-600 text-xs m-0 mb-2">
                                    OTel ingestion endpoint with dedicated telemetry read/query API.
                                </p>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <Tag value="QUERY API DEPENDENT" severity="secondary" icon="pi pi-info-circle" className="text-xs w-full" />
                                </div>
                                <div className="text-xs text-500">Requires Query endpoint</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Backend Environment Card */}
            <div className="grid">
                <div className="col-12 md:col-6">
                    <Card className="shadow-1 border-1 surface-border h-full">
                        <div className="flex align-items-center gap-2 mb-3">
                            <i className="pi pi-server text-primary"></i>
                            <h3 className="text-lg font-bold text-900 m-0">Backend Infrastructure</h3>
                        </div>
                        <div className="flex flex-column gap-2 text-sm">
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">API Gateway</span>
                                <span className="font-mono text-xs text-900 overflow-hidden text-overflow-ellipsis max-w-18rem">
                                    {apiBaseUrl}
                                </span>
                            </div>
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">Compute Layer</span>
                                <span className="text-900 font-semibold">AWS Lambda (Python 3.10)</span>
                            </div>
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">Persistence Provider</span>
                                <span className="text-900 font-semibold">Amazon DynamoDB (tattvaai_investigations)</span>
                            </div>
                            <div className="flex justify-content-between py-2">
                                <span className="text-600 font-medium">Report Storage</span>
                                <span className="text-900 font-semibold">Amazon S3 (tattvaai-investigation-reports)</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6">
                    <Card className="shadow-1 border-1 surface-border h-full">
                        <div className="flex align-items-center gap-2 mb-3">
                            <i className="pi pi-bolt text-primary"></i>
                            <h3 className="text-lg font-bold text-900 m-0">Pipeline & Reasoning Intelligence</h3>
                        </div>
                        <div className="flex flex-column gap-2 text-sm">
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">Reasoning Engine</span>
                                <span className="text-900 font-semibold">Amazon Bedrock AI Reasoning</span>
                            </div>
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">Investigation Pipeline</span>
                                <span className="text-900 font-semibold">8 Specialized Agents</span>
                            </div>
                            <div className="flex justify-content-between py-2 border-bottom-1 surface-border">
                                <span className="text-600 font-medium">Human Authority</span>
                                <span className="text-900 font-semibold">Human-in-the-Loop Review & Audit</span>
                            </div>
                            <div className="flex justify-content-between py-2">
                                <span className="text-600 font-medium">Export Formats</span>
                                <span className="text-900 font-semibold">PDF, JSON, Markdown</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}