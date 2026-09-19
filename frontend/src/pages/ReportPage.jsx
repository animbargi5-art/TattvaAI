import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import { Skeleton } from 'primereact/skeleton';
import { Message } from 'primereact/message';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Toolbar } from 'primereact/toolbar';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import SeverityChart from "../components/Reports/SeverityChart";
import StatusChart from "../components/Reports/StatusChart";
import TrendChart from "../components/Reports/TrendChart";
import ReportStatCard from "../components/Reports/ReportStatCard";
import reportService from "../services/reportService";
import "../styles/pages/reports.css";

const ReportsPage = () => {
    const [dateRange, setDateRange] = useState([null, null]);
    const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
    const [activeTab, setActiveTab] = useState(0);

    // Period options for filtering
    const periodOptions = [
        { label: 'Last 7 Days', value: 'last_7_days' },
        { label: 'Last 30 Days', value: 'last_30_days' },
        { label: 'Last 90 Days', value: 'last_90_days' },
        { label: 'Last Year', value: 'last_year' },
        { label: 'All Time', value: 'all_time' },
        { label: 'Custom Range', value: 'custom' }
    ];

    // Fetch reports data
    const {
        data: reportData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['reports', selectedPeriod, dateRange],
        queryFn: () => reportService.getReportData({
            period: selectedPeriod,
            startDate: dateRange[0],
            endDate: dateRange[1]
        }),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Handle period change
    const handlePeriodChange = (value) => {
        setSelectedPeriod(value);
        if (value !== 'custom') {
            setDateRange([null, null]);
        }
    };

    // Export reports
    const handleExport = async (format = 'pdf') => {
        try {
            await reportService.exportReports(format, {
                period: selectedPeriod,
                startDate: dateRange[0],
                endDate: dateRange[1]
            });
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // Refresh data
    const handleRefresh = () => {
        refetch();
    };

    if (error) {
        return (
            <div className="page-container">
                <Card>
                    <div className="text-center p-4">
                        <i className="pi pi-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                        <h3>Error Loading Reports</h3>
                        <p className="text-600 mb-3">{error.message}</p>
                        <Button 
                            label="Retry" 
                            icon="pi pi-refresh" 
                            onClick={handleRefresh} 
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="reports-container">
            <div className="page-title-row mb-4">
                <h1 className="page-title">Reports &amp; Exports</h1>
                <p className="page-subtitle">Generate and download comprehensive incident reports in JSON, Markdown, and PDF formats.</p>
            </div>

            {/* Export Cards Section */}
            <div className="grid mb-4">
                <div className="col-12 md:col-4">
                    <div className="clean-card h-full flex flex-column justify-content-between">
                        <div>
                            <div className="flex align-items-center gap-3 mb-2">
                                <div className="card-icon-badge">
                                    <i className="pi pi-file"></i>
                                </div>
                                <h3 className="card-header-title">JSON Export</h3>
                            </div>
                            <p className="card-header-subtitle mb-4">
                                Machine-readable structured telemetry payload with complete multi-agent evidence schema.
                            </p>
                        </div>
                        <Button 
                            label="Export JSON" 
                            icon="pi pi-download" 
                            className="btn-primary w-full"
                            onClick={() => handleExport('json')}
                        />
                    </div>
                </div>

                <div className="col-12 md:col-4">
                    <div className="clean-card h-full flex flex-column justify-content-between">
                        <div>
                            <div className="flex align-items-center gap-3 mb-2">
                                <div className="card-icon-badge">
                                    <i className="pi pi-file-edit"></i>
                                </div>
                                <h3 className="card-header-title">Markdown Export</h3>
                            </div>
                            <p className="card-header-subtitle mb-4">
                                Clean formatted incident documentation suitable for GitHub issues, Slack, and postmortems.
                            </p>
                        </div>
                        <Button 
                            label="Export Markdown" 
                            icon="pi pi-download" 
                            className="btn-primary w-full"
                            onClick={() => handleExport('markdown')}
                        />
                    </div>
                </div>

                <div className="col-12 md:col-4">
                    <div className="clean-card h-full flex flex-column justify-content-between">
                        <div>
                            <div className="flex align-items-center gap-3 mb-2">
                                <div className="card-icon-badge">
                                    <i className="pi pi-file-pdf"></i>
                                </div>
                                <h3 className="card-header-title">PDF Export</h3>
                            </div>
                            <p className="card-header-subtitle mb-4">
                                Executive audit-grade PDF report with timeline, root-cause graphs, and human review decisions.
                            </p>
                        </div>
                        <Button 
                            label="Export PDF" 
                            icon="pi pi-download" 
                            className="btn-primary w-full"
                            onClick={() => handleExport('pdf')}
                        />
                    </div>
                </div>
            </div>

            {/* Filters and Controls */}
            <Card className="mb-4">
                <Toolbar>
                    <div className="p-toolbar-group-start">
                        <div className="flex gap-3 align-items-center flex-wrap">
                            <div className="field">
                                <label className="block text-sm font-medium mb-1">Time Period</label>
                                <Dropdown
                                    value={selectedPeriod}
                                    options={periodOptions}
                                    onChange={(e) => handlePeriodChange(e.value)}
                                    className="w-12rem"
                                />
                            </div>
                            {selectedPeriod === 'custom' && (
                                <div className="field">
                                    <label className="block text-sm font-medium mb-1">Date Range</label>
                                    <Calendar
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.value)}
                                        selectionMode="range"
                                        readOnlyInput
                                        showIcon
                                        className="w-16rem"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-toolbar-group-end">
                        <Button
                            icon="pi pi-refresh"
                            className="p-button-outlined mr-2"
                            onClick={handleRefresh}
                            tooltip="Refresh Data"
                            tooltipOptions={{ position: 'bottom' }}
                            loading={isLoading}
                        />
                        <Button
                            icon="pi pi-download"
                            label="Export"
                            onClick={() => handleExport('pdf')}
                            tooltip="Export Report"
                            tooltipOptions={{ position: 'bottom' }}
                        />
                    </div>
                </Toolbar>
            </Card>

            {isLoading ? (
                <div className="grid">
                    <div className="col-12">
                        <Card>
                            <div className="grid">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="col-12 md:col-6 lg:col-2">
                                        <Skeleton height="6rem" className="mb-2"></Skeleton>
                                    </div>
                                ))}
                            </div>
                            <Divider />
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <Skeleton height="20rem"></Skeleton>
                                </div>
                                <div className="col-12 md:col-6">
                                    <Skeleton height="20rem"></Skeleton>
                                </div>
                                <div className="col-12">
                                    <Skeleton height="20rem"></Skeleton>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : reportData ? (
                <>
                    {/* Statistics Cards */}
                    <div className="grid mb-4">
                        <div className="col-12 md:col-6 lg:col-2">
                            <ReportStatCard
                                title="Total Investigations"
                                value={reportData.statistics?.total || 0}
                                icon="pi pi-chart-line"
                                color="blue"
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-2">
                            <ReportStatCard
                                title="Critical"
                                value={reportData.statistics?.critical || 0}
                                icon="pi pi-exclamation-triangle"
                                color="red"
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-2">
                            <ReportStatCard
                                title="High Priority"
                                value={reportData.statistics?.high || 0}
                                icon="pi pi-arrow-up"
                                color="orange"
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-2">
                            <ReportStatCard
                                title="Medium Priority"
                                value={reportData.statistics?.medium || 0}
                                icon="pi pi-minus"
                                color="yellow"
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-2">
                            <ReportStatCard
                                title="Resolved"
                                value={reportData.statistics?.resolved || 0}
                                icon="pi pi-check-circle"
                                color="green"
                            />
                        </div>
                    </div>

                    {/* Charts Section */}
                    <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                        <TabPanel header="Overview" leftIcon="pi pi-chart-pie">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <SeverityChart data={reportData.severity || []} />
                                </div>
                                <div className="col-12 md:col-6">
                                    <StatusChart data={reportData.status || []} />
                                </div>
                            </div>
                        </TabPanel>
                        <TabPanel header="Trends" leftIcon="pi pi-chart-line">
                            <div className="grid">
                                <div className="col-12">
                                    <TrendChart data={reportData.trends || []} />
                                </div>
                            </div>
                        </TabPanel>
                        <TabPanel header="Performance" leftIcon="pi pi-stopwatch">
                            <div className="grid">
                                <div className="col-12">
                                    <Card>
                                        <h3>Performance Metrics</h3>
                                        <div className="grid">
                                            <div className="col-12 md:col-4">
                                                <div className="text-center">
                                                    <h4>Avg Resolution Time</h4>
                                                    <p className="text-2xl font-bold text-blue-500">
                                                        {reportData.performance?.avgResolutionTime || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="col-12 md:col-4">
                                                <div className="text-center">
                                                    <h4>Success Rate</h4>
                                                    <p className="text-2xl font-bold text-green-500">
                                                        {reportData.performance?.successRate || 'N/A'}%
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="col-12 md:col-4">
                                                <div className="text-center">
                                                    <h4>Avg Confidence</h4>
                                                    <p className="text-2xl font-bold text-purple-500">
                                                        {reportData.performance?.avgConfidence || 'N/A'}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </>
            ) : (
                <Card>
                    <Message severity="info" text="No report data available for the selected period." />
                </Card>
            )}
        </div>
    );
};

export default ReportsPage;