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
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useNavigate } from 'react-router-dom';
import historyService from '../services/historyService';
import '../styles/pages.css';

const HistoryPage = () => {
    const navigate = useNavigate();
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.CONTAINS },
        incident_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
        severity: { value: null, matchMode: FilterMatchMode.EQUALS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        created_at: { 
            operator: FilterOperator.AND, 
            constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] 
        },
        confidence: { 
            operator: FilterOperator.AND, 
            constraints: [{ value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO }] 
        }
    });

    // Fetch investigations data
    const {
        data: investigations = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['investigations-history'],
        queryFn: () => historyService.getAllInvestigations(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Severity options for filtering
    const severityOptions = [
        { label: 'Critical', value: 'CRITICAL' },
        { label: 'High', value: 'HIGH' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Low', value: 'LOW' }
    ];

    // Status options for filtering
    const statusOptions = [
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Pending', value: 'PENDING' }
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
            title: { value: null, matchMode: FilterMatchMode.CONTAINS },
            incident_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
            severity: { value: null, matchMode: FilterMatchMode.EQUALS },
            status: { value: null, matchMode: FilterMatchMode.EQUALS },
            created_at: { 
                operator: FilterOperator.AND, 
                constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] 
            },
            confidence: { 
                operator: FilterOperator.AND, 
                constraints: [{ value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO }] 
            }
        });
        setGlobalFilterValue('');
    };

    // Render severity tag
    const severityBodyTemplate = (rowData) => {
        const getSeverityColor = (severity) => {
            switch (severity) {
                case 'CRITICAL': return 'danger';
                case 'HIGH': return 'warning';
                case 'MEDIUM': return 'info';
                case 'LOW': return 'success';
                default: return null;
            }
        };

        return (
            <Tag 
                value={rowData.severity} 
                severity={getSeverityColor(rowData.severity)}
            />
        );
    };

    // Render status tag
    const statusBodyTemplate = (rowData) => {
        const getStatusColor = (status) => {
            switch (status) {
                case 'COMPLETED': return 'success';
                case 'IN_PROGRESS': return 'info';
                case 'FAILED': return 'danger';
                case 'PENDING': return 'warning';
                default: return null;
            }
        };

        return (
            <Tag 
                value={rowData.status} 
                severity={getStatusColor(rowData.status)}
            />
        );
    };

    // Render confidence progress bar
    const confidenceBodyTemplate = (rowData) => {
        return (
            <div className="confidence-cell">
                <ProgressBar 
                    value={rowData.confidence} 
                    className="confidence-progress"
                />
                <span className="confidence-text">{rowData.confidence}%</span>
            </div>
        );
    };

    // Render date
    const dateBodyTemplate = (rowData) => {
        return new Date(rowData.created_at).toLocaleString();
    };

    // Render actions
    const actionBodyTemplate = (rowData) => {
        return (
            <div className="history-actions">
                <Button 
                    icon="pi pi-eye" 
                    size="small" 
                    text
                    tooltip="View Investigation"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => navigate(`/investigation/${rowData.id}`)}
                />
                <Button 
                    icon="pi pi-download" 
                    size="small" 
                    text
                    tooltip="Export Report"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleExport(rowData.id)}
                />
            </div>
        );
    };

    // Handle export
    const handleExport = async (id) => {
        try {
            await historyService.exportInvestigation(id, 'pdf');
            // Toast notification will be handled by interceptors
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // Toolbar content
    const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
                <h4 className="m-0">Investigation History</h4>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search investigations..."
                        className="w-20rem"
                    />
                </span>
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
                        <h3>Error Loading History</h3>
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
        <div className="history-page">
            <Card className="history-datatable">
                <Toolbar className="history-toolbar">
                    <div className="p-toolbar-group-start">
                        <h2 className="page-title">Investigation History</h2>
                        <p className="page-subtitle">View and manage all investigation records</p>
                    </div>
                    <div className="p-toolbar-group-end">
                        <Button 
                            label="Clear Filters" 
                            icon="pi pi-filter-slash" 
                            className="p-button-outlined" 
                            onClick={clearFilters}
                        />
                    </div>
                </Toolbar>

                <DataTable 
                    value={investigations}
                    loading={isLoading}
                    paginator 
                    rows={25} 
                    rowsPerPageOptions={[10, 25, 50]}
                    header={header}
                    filters={filters} 
                    onFilter={(e) => setFilters(e.filters)}
                    globalFilterFields={['title', 'incident_id', 'severity', 'status']}
                    emptyMessage="No investigations found."
                    responsiveLayout="scroll"
                    className="p-datatable-gridlines"
                    stripedRows
                    sortMode="multiple"
                    removableSort
                >
                    <Column 
                        field="incident_id" 
                        header="Incident ID" 
                        sortable 
                        filter 
                        filterPlaceholder="Filter by ID"
                        style={{ minWidth: '10rem' }}
                    />
                    <Column 
                        field="title" 
                        header="Title" 
                        sortable 
                        filter 
                        filterPlaceholder="Filter by title"
                        style={{ minWidth: '15rem' }}
                    />
                    <Column 
                        field="severity" 
                        header="Severity" 
                        body={severityBodyTemplate} 
                        sortable 
                        filter 
                        filterElement={
                            <MultiSelect 
                                options={severityOptions} 
                                placeholder="Select severities"
                                className="p-column-filter"
                            />
                        }
                        style={{ minWidth: '8rem' }}
                    />
                    <Column 
                        field="status" 
                        header="Status" 
                        body={statusBodyTemplate} 
                        sortable 
                        filter 
                        filterElement={
                            <Dropdown 
                                options={statusOptions} 
                                placeholder="Select status"
                                className="p-column-filter"
                                showClear
                            />
                        }
                        style={{ minWidth: '8rem' }}
                    />
                    <Column 
                        field="confidence" 
                        header="Confidence" 
                        body={confidenceBodyTemplate} 
                        sortable 
                        filter 
                        filterElement={
                            <InputText 
                                placeholder="Min confidence"
                                className="p-column-filter"
                                type="number"
                                min="0"
                                max="100"
                            />
                        }
                        style={{ minWidth: '10rem' }}
                    />
                    <Column 
                        field="created_at" 
                        header="Created" 
                        body={dateBodyTemplate} 
                        sortable 
                        filter 
                        filterElement={
                            <Calendar 
                                placeholder="Select date"
                                className="p-column-filter"
                                showIcon
                            />
                        }
                        style={{ minWidth: '12rem' }}
                    />
                    <Column 
                        body={actionBodyTemplate} 
                        header="Actions"
                        exportable={false}
                        style={{ minWidth: '8rem' }}
                        className="history-actions"
                    />
                </DataTable>
            </Card>
        </div>
    );
};

export default HistoryPage;