import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";

export default function EvidenceProvenanceDialog({ visible, onHide, sourceData }) {
    if (!sourceData) return null;

    const {
        provider = "Mock / Demo",
        providerKey = "mock",
        mode = "DEMO",
        signalType = "Distributed Trace",
        sourceId = null,
        timeRange = "Last 15 minutes",
        service = "api-gateway",
        region = "us-east-1",
        acquisitionMethod = "",
        sourceUrl = null,
        isMock = false,
        agentName = null,
        description = ""
    } = sourceData;

    const isLive = mode === "LIVE" && !isMock;

    return (
        <Dialog
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-compass text-primary text-xl"></i>
                    <div>
                        <span className="font-bold text-lg text-900">
                            Telemetry Provenance & Source Inspection
                        </span>
                        <div className="text-xs text-500 font-normal">
                            Where did this evidence come from?
                        </div>
                    </div>
                </div>
            }
            visible={visible}
            onHide={onHide}
            style={{ width: "90vw", maxWidth: "620px" }}
            footer={
                <div className="flex justify-content-between align-items-center gap-2 pt-2">
                    <div className="text-xs text-500">
                        {isMock ? (
                            <span className="text-orange-600 font-medium flex align-items-center gap-1">
                                <i className="pi pi-info-circle"></i>
                                Synthetic Demonstration Data
                            </span>
                        ) : (
                            <span className="text-green-600 font-medium flex align-items-center gap-1">
                                <i className="pi pi-check-circle"></i>
                                Verified Production Telemetry
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Close"
                            icon="pi pi-times"
                            severity="secondary"
                            outlined
                            onClick={onHide}
                        />
                        {sourceUrl && (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: "none" }}
                            >
                                <Button
                                    label="View in AWS Console"
                                    icon="pi pi-external-link"
                                    severity="primary"
                                />
                            </a>
                        )}
                    </div>
                </div>
            }
        >
            <div className="flex flex-column gap-3 pt-2">
                {/* Provider & Mode Banner */}
                <div className="surface-ground p-3 border-round border-1 surface-border flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2">
                    <div className="flex align-items-center gap-2">
                        <i className={isMock ? "pi pi-box text-orange-500 text-xl" : "pi pi-cloud text-primary text-xl"}></i>
                        <div>
                            <div className="font-bold text-900 text-sm">{provider}</div>
                            <div className="text-xs text-600">{agentName ? `${agentName} Stage` : signalType}</div>
                        </div>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Tag
                            value={isMock ? "SYNTHETIC DEMO" : "LIVE TELEMETRY"}
                            severity={isMock ? "warning" : "success"}
                            className="text-xs font-bold px-2 py-1"
                            icon={isMock ? "pi pi-box" : "pi pi-wifi"}
                        />
                    </div>
                </div>

                {/* Synthetic Warning if Mock */}
                {isMock && (
                    <div className="surface-orange-50 p-3 border-round border-1 border-orange-200">
                        <div className="flex align-items-start gap-2">
                            <i className="pi pi-exclamation-triangle text-orange-600 mt-1"></i>
                            <div className="text-xs text-orange-900 line-height-3">
                                <strong>Synthetic Telemetry Notice:</strong> This evidence is generated by the Mock/Demo provider and is not live telemetry. It represents a deterministic test scenario for offline evaluation and developer demonstration.
                            </div>
                        </div>
                    </div>
                )}

                {/* Provenance Metadata Grid */}
                <div className="grid">
                    <div className="col-12 sm:col-6">
                        <div className="surface-card p-2 border-round border-1 surface-border h-full">
                            <span className="text-500 font-medium text-xs block mb-1">Source Provider</span>
                            <span className="font-semibold text-800 text-sm flex align-items-center gap-1">
                                <i className="pi pi-server text-xs text-primary"></i>
                                {provider}
                            </span>
                        </div>
                    </div>

                    <div className="col-12 sm:col-6">
                        <div className="surface-card p-2 border-round border-1 surface-border h-full">
                            <span className="text-500 font-medium text-xs block mb-1">Signal Type</span>
                            <span className="font-semibold text-800 text-sm flex align-items-center gap-1">
                                <i className="pi pi-bolt text-xs text-primary"></i>
                                {signalType}
                            </span>
                        </div>
                    </div>

                    <div className="col-12 sm:col-6">
                        <div className="surface-card p-2 border-round border-1 surface-border h-full">
                            <span className="text-500 font-medium text-xs block mb-1">Service / Resource</span>
                            <span className="font-semibold text-800 text-sm font-mono flex align-items-center gap-1">
                                <i className="pi pi-box text-xs text-primary"></i>
                                {service}
                            </span>
                        </div>
                    </div>

                    <div className="col-12 sm:col-6">
                        <div className="surface-card p-2 border-round border-1 surface-border h-full">
                            <span className="text-500 font-medium text-xs block mb-1">Analysis Window</span>
                            <span className="font-semibold text-800 text-sm flex align-items-center gap-1">
                                <i className="pi pi-clock text-xs text-primary"></i>
                                {timeRange}
                            </span>
                        </div>
                    </div>

                    {sourceId && (
                        <div className="col-12">
                            <div className="surface-card p-2 border-round border-1 surface-border">
                                <span className="text-500 font-medium text-xs block mb-1">
                                    Source Identifier (Trace ID / Log Group / Resource)
                                </span>
                                <span className="font-mono text-xs text-900 surface-ground px-2 py-1 border-round block overflow-hidden text-overflow-ellipsis">
                                    {sourceId}
                                </span>
                            </div>
                        </div>
                    )}

                    {providerKey === "aws" && (
                        <div className="col-12 sm:col-6">
                            <div className="surface-card p-2 border-round border-1 surface-border h-full">
                                <span className="text-500 font-medium text-xs block mb-1">AWS Region</span>
                                <span className="font-semibold text-800 text-sm font-mono flex align-items-center gap-1">
                                    <i className="pi pi-globe text-xs text-primary"></i>
                                    {region}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <Divider className="my-1" />

                {/* How TattvaAI Obtained This Evidence */}
                <div>
                    <span className="text-700 font-semibold text-xs block mb-1">
                        How TattvaAI Obtained This Evidence:
                    </span>
                    <p className="text-600 text-xs line-height-3 m-0 surface-ground p-2 border-round border-1 surface-border">
                        {acquisitionMethod || (
                            isMock
                                ? "Generated through TattvaAI's deterministic offline synthetic telemetry engine for payments degradation demonstration."
                                : `Retrieved directly from ${provider} via backend API/SDK integration using IAM execution credentials.`
                        )}
                    </p>
                </div>

                {/* External Console Link Status */}
                <div>
                    <span className="text-700 font-semibold text-xs block mb-1">
                        Console / Source Link Status:
                    </span>
                    {sourceUrl ? (
                        <div className="text-xs text-green-700 surface-green-50 p-2 border-round border-1 border-green-200 flex align-items-center gap-2">
                            <i className="pi pi-check text-green-600"></i>
                            <span>Verified deep link available to external AWS console for this identifier.</span>
                        </div>
                    ) : (
                        <div className="text-xs text-600 surface-ground p-2 border-round border-1 surface-border flex align-items-center gap-2">
                            <i className="pi pi-info-circle text-500"></i>
                            <span>
                                {isMock
                                    ? "External console link unavailable: Mock evidence is synthetic and does not exist in an external observability platform."
                                    : "External deep link not configured for this telemetry signal."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
