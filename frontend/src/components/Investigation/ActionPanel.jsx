import { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import historyService from "../../services/historyService";

export default function ActionPanel({ 
    onRefresh, 
    onDelete, 
    onExport,
    investigationId,
    refreshLoading = false, 
    deleteLoading = false,
    exportLoading = false
}) {
    const [currentExportFormat, setCurrentExportFormat] = useState(null);

    const headerTemplate = () => (
        <div className="flex align-items-center gap-2">
            <i className="pi pi-cog text-700"></i>
            <span className="font-semibold">Investigation Actions & Export</span>
        </div>
    );

    const handleExportClick = async (format = 'pdf') => {
        if (!investigationId || investigationId === 'undefined' || investigationId === 'null') {
            console.error('Cannot export report: investigation ID is missing');
            return;
        }

        if (onExport) {
            onExport(format);
            return;
        }

        setCurrentExportFormat(format);
        try {
            await historyService.exportInvestigation(investigationId, format);
        } catch (err) {
            console.error(`Export ${format} failed:`, err);
        } finally {
            setCurrentExportFormat(null);
        }
    };

    const hasValidId = Boolean(investigationId && investigationId !== 'undefined' && investigationId !== 'null');

    return (
        <Card header={headerTemplate} className="action-panel-card shadow-1 border-1 surface-border">
            <div className="flex flex-column gap-3">
                <p className="text-600 m-0 text-sm">
                    Manage and export this incident investigation with official PDF reports, raw telemetry JSON, or executive Markdown.
                </p>

                <Divider className="my-1" />

                <div className="flex flex-wrap gap-3 justify-content-between align-items-center">
                    {/* Primary & Secondary Actions */}
                    <div className="flex flex-wrap gap-2 align-items-center">
                        <Button
                            label="Refresh Investigation"
                            icon="pi pi-refresh"
                            onClick={onRefresh}
                            loading={refreshLoading}
                            severity="primary"
                            className="btn-primary"
                            size="small"
                            tooltip="Re-run the AI investigation analysis workflow"
                            tooltipOptions={{ position: 'top' }}
                        />
                        
                        <Button
                            label="Export PDF"
                            icon={currentExportFormat === 'pdf' ? "pi pi-spin pi-spinner" : "pi pi-file-pdf"}
                            severity="secondary"
                            outlined
                            size="small"
                            onClick={() => handleExportClick('pdf')}
                            loading={exportLoading || currentExportFormat === 'pdf'}
                            tooltip="Download official incident investigation PDF report"
                            tooltipOptions={{ position: 'top' }}
                            disabled={!hasValidId}
                        />

                        <Button
                            label="Export Markdown"
                            icon={currentExportFormat === 'md' ? "pi pi-spin pi-spinner" : "pi pi-file"}
                            severity="secondary"
                            outlined
                            size="small"
                            onClick={() => handleExportClick('md')}
                            loading={currentExportFormat === 'md'}
                            tooltip="Download investigation summary in Markdown format"
                            tooltipOptions={{ position: 'top' }}
                            disabled={!hasValidId}
                        />

                        <Button
                            label="Export JSON"
                            icon={currentExportFormat === 'json' ? "pi pi-spin pi-spinner" : "pi pi-code"}
                            severity="secondary"
                            outlined
                            size="small"
                            onClick={() => handleExportClick('json')}
                            loading={currentExportFormat === 'json'}
                            tooltip="Download raw investigation state and evidence JSON"
                            tooltipOptions={{ position: 'top' }}
                            disabled={!hasValidId}
                        />
                    </div>

                    {/* Destructive Actions */}
                    <div className="flex gap-2">
                        <Button
                            label="Delete Investigation"
                            icon="pi pi-trash"
                            onClick={onDelete}
                            loading={deleteLoading}
                            severity="danger"
                            outlined
                            size="small"
                            tooltip="Permanently delete this investigation record"
                            tooltipOptions={{ position: 'top' }}
                        />
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-2 p-3 surface-ground border-round border-1 surface-border">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-info-circle text-primary text-base"></i>
                        <div className="text-xs text-700">
                            <strong>Export formats:</strong> PDF contains executive root causes, telemetry charts, and human sign-off; Markdown provides Git-ready incident notes; JSON gives full raw agent evidence and topology.
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}