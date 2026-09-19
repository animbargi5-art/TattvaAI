import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useWebSocket } from './useWebSocket';

/**
 * Custom hook for dashboard data and real-time updates
 * Manages dashboard statistics, recent investigations, and real-time data
 */
export const useDashboard = (options = {}) => {
    const {
        enableRealTime = true,
        refreshInterval = 30000, // 30 seconds
        autoRefresh = true
    } = options;

    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        timeRange: '24h',
        severity: 'all',
        status: 'all'
    });

    // Fetch dashboard statistics
    const {
        data: statistics,
        isLoading: isStatisticsLoading,
        error: statisticsError,
        refetch: refetchStatistics
    } = useQuery({
        queryKey: ['dashboard-statistics', filters],
        queryFn: () => dashboardService.getDashboardStatistics(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: autoRefresh ? refreshInterval : false,
    });

    // Fetch recent investigations
    const {
        data: recentInvestigations = [],
        isLoading: isRecentLoading,
        error: recentError,
        refetch: refetchRecent
    } = useQuery({
        queryKey: ['recent-investigations', filters.timeRange],
        queryFn: () => dashboardService.getRecentInvestigations({ 
            limit: 10, 
            timeRange: filters.timeRange 
        }),
        staleTime: 1 * 60 * 1000, // 1 minute
        refetchInterval: autoRefresh ? refreshInterval : false,
    });

    // Fetch system status
    const {
        data: systemStatus,
        isLoading: isStatusLoading,
        error: statusError
    } = useQuery({
        queryKey: ['system-status'],
        queryFn: () => dashboardService.getSystemStatus(),
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 10000, // Check every 10 seconds
    });

    // Fetch investigation progress for active investigations
    const {
        data: activeInvestigations = [],
        isLoading: isActiveLoading
    } = useQuery({
        queryKey: ['active-investigations'],
        queryFn: () => dashboardService.getActiveInvestigations(),
        staleTime: 15 * 1000, // 15 seconds
        refetchInterval: 5000, // Update every 5 seconds for active investigations
    });

    // WebSocket connection for real-time updates
    const { isConnected, connectionStatus } = useWebSocket(
        enableRealTime ? '/ws/dashboard' : null,
        {
            onMessage: (data) => {
                handleRealtimeUpdate(data);
            },
            onError: (error) => {
                console.error('Dashboard WebSocket error:', error);
            }
        }
    );

    // Handle real-time updates
    const handleRealtimeUpdate = useCallback((data) => {
        const { type, payload } = data;

        switch (type) {
            case 'investigation_created':
                queryClient.invalidateQueries({ queryKey: ['recent-investigations'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
                break;

            case 'investigation_updated':
                queryClient.invalidateQueries({ queryKey: ['active-investigations'] });
                if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
                    queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
                }
                break;

            case 'investigation_completed':
                queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
                queryClient.invalidateQueries({ queryKey: ['recent-investigations'] });
                queryClient.invalidateQueries({ queryKey: ['active-investigations'] });
                break;

            case 'system_status_update':
                queryClient.setQueryData(['system-status'], payload);
                break;

            default:
                console.log('Unknown real-time update type:', type);
        }
    }, [queryClient]);

    // Filter management
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            timeRange: '24h',
            severity: 'all',
            status: 'all'
        });
    }, []);

    // Manual refresh
    const refreshAll = useCallback(() => {
        refetchStatistics();
        refetchRecent();
        queryClient.invalidateQueries({ queryKey: ['system-status'] });
        queryClient.invalidateQueries({ queryKey: ['active-investigations'] });
    }, [refetchStatistics, refetchRecent, queryClient]);

    // Computed values
    const dashboardData = useMemo(() => {
        if (!statistics) return null;

        return {
            totalInvestigations: statistics.total || 0,
            activeInvestigations: statistics.active || 0,
            completedToday: statistics.completedToday || 0,
            averageResolutionTime: statistics.avgResolutionTime || 0,
            
            // Severity breakdown
            criticalCount: statistics.severity?.critical || 0,
            highCount: statistics.severity?.high || 0,
            mediumCount: statistics.severity?.medium || 0,
            lowCount: statistics.severity?.low || 0,
            
            // Status breakdown
            investigatingCount: statistics.status?.investigating || 0,
            completedCount: statistics.status?.completed || 0,
            failedCount: statistics.status?.failed || 0,
            
            // Trends
            todayTrend: statistics.trends?.today || 0,
            weekTrend: statistics.trends?.week || 0,
            monthTrend: statistics.trends?.month || 0,
        };
    }, [statistics]);

    // System health indicators
    const systemHealth = useMemo(() => {
        if (!systemStatus) return { overall: 'unknown', services: {} };

        const services = systemStatus.services || {};
        const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
        const totalServices = Object.keys(services).length;
        
        let overall = 'healthy';
        if (healthyServices === 0) {
            overall = 'critical';
        } else if (healthyServices < totalServices) {
            overall = 'degraded';
        }

        return {
            overall,
            services,
            uptime: systemStatus.uptime,
            version: systemStatus.version,
            healthyServices,
            totalServices
        };
    }, [systemStatus]);

    // Loading and error states
    const isLoading = isStatisticsLoading || isRecentLoading || isStatusLoading;
    const hasError = statisticsError || recentError || statusError;

    return {
        // Data
        dashboardData,
        statistics,
        recentInvestigations,
        activeInvestigations,
        systemStatus,
        systemHealth,
        
        // Loading states
        isLoading,
        isStatisticsLoading,
        isRecentLoading,
        isActiveLoading,
        isStatusLoading,
        
        // Error states
        hasError,
        statisticsError,
        recentError,
        statusError,
        
        // Filters
        filters,
        updateFilters,
        resetFilters,
        
        // Actions
        refreshAll,
        refetchStatistics,
        refetchRecent,
        
        // Real-time connection
        isConnected,
        connectionStatus,
        enableRealTime,
        
        // Computed helpers
        hasActiveInvestigations: activeInvestigations.length > 0,
        hasRecentActivity: recentInvestigations.length > 0,
        systemHealthStatus: systemHealth.overall
    };
};

export default useDashboard;