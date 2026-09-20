import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { ProgressSpinner } from "primereact/progressspinner";

export default function InvestigationStatus({ status, loading, running }) {
    const getStatusInfo = () => {
        if (running || status?.status === 'running') {
            return {
                severity: 'success',
                icon: 'pi pi-spin pi-spinner',
                label: 'RUNNING',
                description: 'AI agents are investigating incident...',
                color: 'text-green-500'
            };
        } else if (status?.status === 'completed') {
            return {
                severity: 'info',
                icon: 'pi pi-check',
                label: 'COMPLETED',
                description: 'Last investigation completed successfully',
                color: 'text-blue-500'
            };
        } else if (status?.status === 'failed') {
            return {
                severity: 'danger',
                icon: 'pi pi-times',
                label: 'FAILED',
                description: 'Last investigation encountered an error',
                color: 'text-red-500'
            };
        } else {
            return {
                severity: 'secondary',
                icon: 'pi pi-circle',
                label: 'IDLE',
                description: 'Ready to start a new investigation',
                color: 'text-500'
            };
        }
    };

    const statusInfo = getStatusInfo();

    if (loading) {
        return (
            <div className="clean-card h-full flex flex-column justify-content-between">
                <div className="card-header-clean mb-3">
                    <div className="card-header-title-group">
                        <div className="card-icon-badge">
                            <i className="pi pi-info-circle"></i>
                        </div>
                        <div>
                            <h3 className="card-header-title">Investigation Status</h3>
                            <p className="card-header-subtitle">Real-time incident state and progress</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-column gap-2">
                    <Skeleton height="1.75rem" width="6rem" className="border-round" />
                    <Skeleton height="1.1rem" width="80%" />
                </div>
            </div>
        );
    }

    return (
        <div className="clean-card h-full flex flex-column justify-content-between">
            <div>
                {/* Header matching card system */}
                <div className="card-header-clean mb-3">
                    <div className="card-header-title-group">
                        <div className="card-icon-badge">
                            <i className="pi pi-info-circle"></i>
                        </div>
                        <div>
                            <h3 className="card-header-title">Investigation Status</h3>
                            <p className="card-header-subtitle">Real-time incident state and progress</p>
                        </div>
                    </div>
                </div>

                {/* State Badge & Concise State Message */}
                <div className="flex flex-column gap-2 pt-1">
                    <div>
                        {running ? (
                            <div className="flex align-items-center gap-2">
                                <ProgressSpinner 
                                    style={{ width: '18px', height: '18px' }} 
                                    strokeWidth="4" 
                                />
                                <Tag 
                                    value={statusInfo.label} 
                                    severity={statusInfo.severity}
                                    className="text-xs font-bold px-2 py-1"
                                />
                            </div>
                        ) : (
                            <Tag 
                                value={statusInfo.label} 
                                severity={statusInfo.severity}
                                className="text-xs font-bold px-2 py-1"
                                icon={statusInfo.icon}
                            />
                        )}
                    </div>
                    
                    <p className="text-sm text-700 m-0 font-medium line-height-3">
                        {statusInfo.description}
                    </p>
                </div>
            </div>

            {/* Footer Metadata */}
            {(status?.last_updated || status?.investigation_id) && (
                <div className="pt-3 mt-3 border-top-1 surface-border flex align-items-center justify-content-between text-xs text-500">
                    {status?.last_updated && (
                        <span>Last updated: {new Date(status.last_updated).toLocaleTimeString()}</span>
                    )}
                    {status?.investigation_id && (
                        <span className="font-mono text-600">ID: {status.investigation_id}</span>
                    )}
                </div>
            )}
        </div>
    );
}