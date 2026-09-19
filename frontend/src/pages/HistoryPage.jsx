import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Chip } from 'primereact/chip';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { ProgressBar } from 'primereact/progressbar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useNavigate } from 'react-router-dom';
import historyService from '../services/historyService';
import { resolveTelemetryContext } from '../utils/telemetryContext';
import '../styles/pages.css';

const HistoryPage = () => {
    const navigate = useNavigate();
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [exportingId, setExportingId] = useState(null);
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        incident_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
        service_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        telemetry_source: { value: null, matchMode: FilterMatchMode.EQUALS },
        telemetry_mode: { value: null, matchMode: FilterMatchMode.EQUALS },
        environment: { value: null, matchMode: FilterMatchMode.CONTAINS },
        severity: { value: null, matchMode: FilterMatchMode.EQUALS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        review_status: { value: null, matchMode: FilterMatchMode.EQUALS },
    });

    // Fetch investigations data from backend
    const {
        data: investigations = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['investigations-history'],
        queryFn: () => historyService.getAllInvestigations(),
        staleTime: 60 * 1000,
        refetchInterval: 15000
    });

    // Provider filter options
    const providerFilterOptions = [
        { label: 'AWS Observability', value: 'aws' },
        { label: 'SigNoz', value: 'signoz' },
        { label: 'OpenTelemetry', value: 'opentelemetry' },
        { label: 'Mock / Demo', value: 'mock' }
    ];

    // Mode filter options
    const modeFilterOptions = [
        { label: 'LIVE', value: 'LIVE' },
        { label: 'DEMO', value: 'DEMO' }
    ];

    // Status options for filtering
    const statusOptions = [
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Failed', value: 'FAILED' }
    ];

    // Review options
    const reviewOptions = [
        { label: 'Accepted', value: 'ACCEPTED' },
        { label: 'Pending Review', value: 'PENDING_REVIEW' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Escalated', value: 'ESCALATED' }
    ];

    // Handle global filter
    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        let _filters = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            incident_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
            service_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
            telemetry_source: { value: null, matchMode: FilterMatchMode.EQUALS },
            telemetry_mode: { value: null, matchMode: FilterMatchMode.EQUALS },
            environment: { value: null, matchMode: FilterMatchMode.CONTAINS },
            severity: { value: null, matchMode: FilterMatchMode.EQUALS },
            status: { value: null, matchMode: FilterMatchMode.EQUALS },
            review_status: { value: null, matchMode: FilterMatchMode.EQUALS },
        });
        setGlobalFilterValue('');
    };

    // Render Incident ID link
    const incidentBodyTemplate = (rowData) => {
        const id = rowData.incident_id || rowData.investigation_id || rowData.id;
        return (
            <span
                className="font-mono font-bold text-primary cursor-pointer hover:underline text-sm"
                onClick={() => id && navigate(`/investigation/${id}`)}
            >
                {id}
            </span>
        );
    };

    // Render Service
    const serviceBodyTemplate = (rowData) => {
        const svc = rowData.service_name || rowData.report?.service_name || "gateway";
        return (
            <Chip
                label={svc}
                icon="pi pi-server"
                className="text-xs font-semibold py-1 px-2"
            />
        );
    };

    // Render telemetry provider tag
    const providerBodyTemplate = (rowData) => {
        const { provider } = resolveTelemetryContext(rowData);
        return <Tag value={provider.label} icon={provider.icon} severity={provider.severity} className="text-xs" />;
    };

    // Render telemetry mode tag (Using actual backend field telemetry_mode, never deriving alone)
    const modeBodyTemplate = (rowData) => {
        const { mode } = resolveTelemetryContext(rowData);
        return (
            <Tag
                value={mode.label}
                icon={mode.key === 'LIVE' ? 'pi pi-wifi' : 'pi pi-box'}
                severity={mode.severity}
                className="text-xs font-bold"
            />
        );
    };

    // Render Environment
    const environmentBodyTemplate = (rowData) => {
        const env = rowData.environment || rowData.report?.environment || "production";
        return <span className="text-xs font-medium text-700 capitalize">{env}</span>;
    };

    // Render status tag
    const statusBodyTemplate = (rowData) => {
        const st = (rowData.status || 'COMPLETED').toUpperCase();
        const getStatusColor = (s) => {
            switch (s) {
                case 'COMPLETED': return 'success';
                case 'IN_PROGRESS': return 'info';
                case 'FAILED': return 'danger';
                default: return 'secondary';
            }
        };

        return (
            <Tag
                value={st}
                severity={getStatusColor(st)}
                className="text-xs font-semibold"
            />
        );
    };

    // Render confidence progress bar
    const confidenceBodyTemplate = (rowData) => {
        const conf = rowData.confidence ?? rowData.report?.confidence ?? 0;
        return (
            <div className="flex align-items-center gap-2" style={{ minWidth: '90px' }}>
                <ProgressBar
                    value={conf}
                    showValue={false}
                    className="flex-1"
                    style={{ height: '6px' }}
                    color={conf >= 85 ? '#22c55e' : conf >= 70 ? '#f59e0b' : '#ef4444'}
                />
                <span className="font-semibold text-xs text-800">{conf}%</span>
            </div>
        );
    };

    // Render Human Review tag
    const reviewBodyTemplate = (rowData) => {
        const review = (rowData.review_status || rowData.review_decision?.status || 'PENDING_REVIEW').toUpperCase();
        switch (review) {
            case 'ACCEPTED':
                return <Tag value="ACCEPTED" severity="success" icon="pi pi-check" className="text-xs font-semibold" />;
            case 'REJECTED':
                return <Tag value="REJECTED" severity="danger" icon="pi pi-times" className="text-xs font-semibold" />;
            case 'ESCALATED':
            case 'ESCALATE':
                return <Tag value="ESCALATED" severity="warning" icon="pi pi-exclamation-circle" className="text-xs font-semibold" />;
            default:
                return <Tag value="PENDING" severity="secondary" icon="pi pi-clock" className="text-xs font-medium" />;
        }
    };

    // Render date
    const dateBodyTemplate = (rowData) => {
        if (!rowData.created_at) return <span className="text-400 text-xs">-</span>;
        return (
            <span className="text-xs text-600 white-space-nowrap">
                {new Date(rowData.created_at).toLocaleString()}
            </span>
        );
    };

    // Handle export
    const handleExport = async (id, format = 'pdf') => {
        if (!id || id === 'undefined' || id === 'null') {
            console.error('Cannot export report: investigation ID is missing');
            return;
        }
        setExportingId(`${id}-${format}`);
        try {
            await historyService.exportInvestigation(id, format);
        } catch (error) {
            console.error(`Export ${format} failed:`, error);
        } finally {
            setExportingId(null);
        }
    };

    // Render actions
    const actionBodyTemplate = (rowData) => {
        const id = rowData.investigation_id || rowData.incident_id || rowData.id;
        const isPdfExporting = exportingId === `${id}-pdf`;
        const isJsonExporting = exportingId === `${id}-json`;

        return (
            <div className="flex align-items-center gap-1">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    rounded
                    tooltip="View Investigation"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => {
                        if (id) navigate(`/investigation/${id}`);
                    }}
                    disabled={!id}
                />
                <Button
                    icon={isPdfExporting ? "pi pi-spin pi-spinner" : "pi pi-file-pdf"}
                    size="small"
                    text
                    rounded
                    severity="danger"
                    tooltip="Export PDF Report"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => {
                        if (id) handleExport(id, 'pdf');
                    }}
                    disabled={!id || isPdfExporting}
                />
                <Button
                    icon={isJsonExporting ? "pi pi-spin pi-spinner" : "pi pi-code"}
                    size="small"
                    text
                    rounded
                    severity="secondary"
                    tooltip="Export Raw JSON"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => {
                        if (id) handleExport(id, 'json');
                    }}
                    disabled={!id || isJsonExporting}
                />
            </div>
        );
    };

    // Toolbar content
    const renderHeader = () => {
        return (
            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-3">
                <div className="flex align-items-center gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            value={globalFilterValue}
                            onChange={onGlobalFilterChange}
                            placeholder="Search incidents, services, providers..."
                            className="w-full sm:w-20rem p-inputtext-sm"
                        />
                    </span>
                </div>
                <div className="flex align-items-center gap-2">
                    <Button
                        label="Clear Filters"
                        icon="pi pi-filter-slash"
                        size="small"
                        outlined
                        severity="secondary"
                        onClick={clearFilters}
                    />
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        size="small"
                        outlined
                        onClick={() => refetch()}
                        loading={isLoading}
                    />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    if (error) {
        return (
            <div className="p-4">
                <Card>
                    <div className="text-center p-4">
                        <i className="pi pi-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                        <h3>Error Loading Investigation History</h3>
                        <p className="text-600">{error.message}</p>
                        <Button
                            label="Retry"
                            icon="pi pi-refresh"
                            onClick={() => refetch()}
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="history-page p-4 max-w-7xl mx-auto">
            <Card className="shadow-1 border-1 surface-border">
                <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-3 gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-900 m-0">Investigation History</h1>
                        <p className="text-600 text-sm m-0 mt-1">
                            Audited incident investigations across AWS Observability, SigNoz, OpenTelemetry, and Demo telemetry.
                        </p>
                    </div>
                </div>

                <DataTable
                    value={investigations}
                    loading={isLoading}
                    paginator
                    rows={15}
                    rowsPerPageOptions={[10, 15, 25, 50]}
                    header={header}
                    filters={filters}
                    onFilter={(e) => setFilters(e.filters)}
                    globalFilterFields={['incident_id', 'service_name', 'telemetry_source', 'telemetry_mode', 'environment', 'status', 'review_status']}
                    emptyMessage="No investigations found."
                    responsiveLayout="scroll"
                    className="p-datatable-sm p-datatable-gridlines"
                    stripedRows
                    sortMode="multiple"
                    removableSort
                >
                    <Column
                        field="incident_id"
                        header="Incident"
                        body={incidentBodyTemplate}
                        sortable
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        field="service_name"
                        header="Service"
                        body={serviceBodyTemplate}
                        sortable
                        style={{ minWidth: '9rem' }}
                    />
                    <Column
                        field="telemetry_source"
                        header="Provider"
                        body={providerBodyTemplate}
                        sortable
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        field="telemetry_mode"
                        header="Mode"
                        body={modeBodyTemplate}
                        sortable
                        style={{ minWidth: '7rem' }}
                    />
                    <Column
                        field="environment"
                        header="Environment"
                        body={environmentBodyTemplate}
                        sortable
                        style={{ minWidth: '8rem' }}
                    />
                    <Column
                        field="status"
                        header="Status"
                        body={statusBodyTemplate}
                        sortable
                        style={{ minWidth: '8rem' }}
                    />
                    <Column
                        field="confidence"
                        header="Confidence"
                        body={confidenceBodyTemplate}
                        sortable
                        style={{ minWidth: '8rem' }}
                    />
                    <Column
                        field="review_status"
                        header="Review"
                        body={reviewBodyTemplate}
                        sortable
                        style={{ minWidth: '8rem' }}
                    />
                    <Column
                        field="created_at"
                        header="Created At"
                        body={dateBodyTemplate}
                        sortable
                        style={{ minWidth: '11rem' }}
                    />
                    <Column
                        body={actionBodyTemplate}
                        header="Actions"
                        exportable={false}
                        style={{ minWidth: '8rem' }}
                    />
                </DataTable>
            </Card>
        </div>
    );
};

export default HistoryPage;