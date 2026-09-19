import api from "../api/interceptors.js";

class TelemetryService {
    constructor() {
        this.baseEndpoint = "/telemetry";
        const proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(proto)
            .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
            .forEach(method => {
                this[method] = this[method].bind(this);
            });
    }

    // Get list of supported telemetry providers
    async getProviders() {
        try {
            const base = this?.baseEndpoint || "/telemetry";
            const response = await api.get(`${base}/providers`);
            return response.data;
        } catch (err) {
            // Default supported provider catalog
            return {
                providers: [
                    {
                        id: "mock",
                        name: "Mock / Demo",
                        description: "Deterministic synthetic demo telemetry for reliable offline testing and showcase.",
                        mode: "DEMO",
                        capabilities: ["traces", "logs", "metrics", "dependencies", "alerts", "historical_incidents"],
                    },
                    {
                        id: "signoz",
                        name: "SigNoz Observability",
                        description: "Live query backend for SigNoz traces, metrics, logs, and service maps.",
                        mode: "LIVE",
                        capabilities: ["traces", "logs", "metrics", "dependencies", "alerts"],
                    },
                    {
                        id: "aws",
                        name: "AWS Observability",
                        description: "AWS CloudWatch metrics/logs and AWS X-Ray distributed traces via IAM credentials.",
                        mode: "LIVE",
                        capabilities: ["traces", "logs", "metrics", "alerts", "dependencies"],
                    },
                    {
                        id: "opentelemetry",
                        name: "OpenTelemetry Query Backend",
                        description: "OpenTelemetry read/query backend for standards-compliant observability backends.",
                        mode: "LIVE",
                        capabilities: ["traces", "logs", "metrics"],
                    },
                ],
                active_default: "mock",
            };
        }
    }

    // Get current active telemetry provider ID
    getActiveProvider() {
        try {
            return localStorage.getItem("tattvaai_active_telemetry_provider") || "aws";
        } catch {
            return "aws";
        }
    }

    // Set current active telemetry provider ID and notify listeners
    setActiveProvider(providerId) {
        try {
            localStorage.setItem("tattvaai_active_telemetry_provider", providerId);
            window.dispatchEvent(new CustomEvent("tattvaai:provider-changed", { detail: { provider: providerId } }));
        } catch (e) {
            console.warn("Could not persist active provider to localStorage", e);
        }
    }

    // Test connection to a telemetry provider
    async testProviderConnection(config = {}) {
        const provider = (config.provider || this.getActiveProvider() || "mock").toLowerCase();

        try {
            const base = this?.baseEndpoint || "/telemetry";
            const response = await api.post(`${base}/providers/test`, {
                ...config,
                provider: provider
            });
            return response.data;
        } catch (err) {
            // Safe fallback evaluation if endpoint is temporarily unreachable
            if (provider === "mock" || provider === "demo") {
                return {
                    connected: true,
                    provider: "mock",
                    message: "Deterministic demo telemetry enabled. Ready for simulation.",
                    capabilities: ["traces", "logs", "metrics", "dependencies", "alerts", "historical_incidents"],
                    mode: "DEMO",
                };
            }

            if (provider === "signoz") {
                return {
                    connected: false,
                    provider: "signoz",
                    message: "Could not reach SigNoz endpoint. Verify that SigNoz is running and the backend can access it.",
                    capabilities: [],
                    mode: "LIVE",
                };
            }

            if (provider === "aws" || provider === "cloudwatch") {
                return {
                    connected: false,
                    provider: "aws",
                    message: err.response?.data?.message || err.response?.data?.detail || "Could not reach AWS Observability endpoint.",
                    capabilities: [],
                    mode: "LIVE",
                };
            }

            if (provider === "opentelemetry" || provider === "otlp") {
                return {
                    connected: false,
                    provider: "opentelemetry",
                    message: "Query endpoint connection failed. Verify URL and network connectivity.",
                    capabilities: [],
                    mode: "LIVE",
                };
            }

            return {
                connected: false,
                provider,
                message: err.response?.data?.detail || err.message || "Connection test failed",
                capabilities: [],
                mode: "LIVE",
            };
        }
    }
}

export const telemetryService = new TelemetryService();
export default telemetryService;
