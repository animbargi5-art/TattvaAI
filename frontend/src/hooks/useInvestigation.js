import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationService } from '../services/investigationService';
import { useToast } from './useToast';

/**
 * Custom hook for investigation-related operations
 * Provides data fetching, state management, and actions for investigations
 */
export const useInvestigation = (investigationId = null) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isPolling, setIsPolling] = useState(false);

    // Fetch single investigation
    const {
        data: investigation,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['investigation', investigationId],
        queryFn: () => investigationService.getInvestigationById(investigationId),
        enabled: !!investigationId,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: isPolling ? 5000 : false, // Poll every 5 seconds when enabled
    });

    // Fetch investigation status
    const {
        data: status,
        isLoading: isStatusLoading
    } = useQuery({
        queryKey: ['investigation-status', investigationId],
        queryFn: () => investigationService.getInvestigationStatus(investigationId),
        enabled: !!investigationId,
        refetchInterval: 2000, // Check status every 2 seconds
    });

    // Create investigation mutation
    const createInvestigationMutation = useMutation({
        mutationFn: (data) => investigationService.createInvestigation(data),
        onSuccess: (newInvestigation) => {
            queryClient.invalidateQueries({ queryKey: ['investigations'] });
            showToast('Investigation created successfully', 'success');
            return newInvestigation;
        },
        onError: (error) => {
            showToast(`Failed to create investigation: ${error.message}`, 'error');
        }
    });

    // Update investigation mutation
    const updateInvestigationMutation = useMutation({
        mutationFn: ({ id, data }) => investigationService.updateInvestigation(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] });
            queryClient.invalidateQueries({ queryKey: ['investigations'] });
            showToast('Investigation updated successfully', 'success');
        },
        onError: (error) => {
            showToast(`Failed to update investigation: ${error.message}`, 'error');
        }
    });

    // Delete investigation mutation
    const deleteInvestigationMutation = useMutation({
        mutationFn: (id) => investigationService.deleteInvestigation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investigations'] });
            showToast('Investigation deleted successfully', 'success');
        },
        onError: (error) => {
            showToast(`Failed to delete investigation: ${error.message}`, 'error');
        }
    });

    // Start investigation mutation
    const startInvestigationMutation = useMutation({
        mutationFn: (params) => investigationService.startInvestigation(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] });
            setIsPolling(true);
            showToast('Investigation started', 'success');
        },
        onError: (error) => {
            showToast(`Failed to start investigation: ${error.message}`, 'error');
        }
    });

    // Stop investigation mutation
    const stopInvestigationMutation = useMutation({
        mutationFn: (id) => investigationService.stopInvestigation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] });
            setIsPolling(false);
            showToast('Investigation stopped', 'info');
        },
        onError: (error) => {
            showToast(`Failed to stop investigation: ${error.message}`, 'error');
        }
    });

    // Export investigation mutation
    const exportInvestigationMutation = useMutation({
        mutationFn: ({ id, format }) => investigationService.exportInvestigation(id, format),
        onSuccess: () => {
            showToast('Investigation exported successfully', 'success');
        },
        onError: (error) => {
            showToast(`Failed to export investigation: ${error.message}`, 'error');
        }
    });

    // Action functions
    const createInvestigation = useCallback((data) => {
        return createInvestigationMutation.mutateAsync(data);
    }, [createInvestigationMutation]);

    const updateInvestigation = useCallback((data) => {
        if (!investigationId) return Promise.reject('No investigation ID provided');
        return updateInvestigationMutation.mutateAsync({ id: investigationId, data });
    }, [investigationId, updateInvestigationMutation]);

    const deleteInvestigation = useCallback((id = investigationId) => {
        if (!id) return Promise.reject('No investigation ID provided');
        return deleteInvestigationMutation.mutateAsync(id);
    }, [investigationId, deleteInvestigationMutation]);

    const startInvestigation = useCallback((id = investigationId) => {
        if (!id) return Promise.reject('No investigation ID provided');
        return startInvestigationMutation.mutateAsync(id);
    }, [investigationId, startInvestigationMutation]);

    const stopInvestigation = useCallback((id = investigationId) => {
        if (!id) return Promise.reject('No investigation ID provided');
        return stopInvestigationMutation.mutateAsync(id);
    }, [investigationId, stopInvestigationMutation]);

    const exportInvestigation = useCallback((format = 'pdf', id = investigationId) => {
        if (!id) return Promise.reject('No investigation ID provided');
        return exportInvestigationMutation.mutateAsync({ id, format });
    }, [investigationId, exportInvestigationMutation]);

    const togglePolling = useCallback(() => {
        setIsPolling(prev => !prev);
    }, []);

    const refreshInvestigation = useCallback(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['investigation-status', investigationId] });
    }, [refetch, queryClient, investigationId]);

    // Helper functions
    const isInProgress = status?.status === 'IN_PROGRESS' || status?.status === 'RUNNING';
    const isCompleted = status?.status === 'COMPLETED';
    const isFailed = status?.status === 'FAILED';
    const canStart = !isInProgress && !isCompleted;
    const canStop = isInProgress;

    return {
        // Data
        investigation,
        status,
        
        // Loading states
        isLoading,
        isStatusLoading,
        isCreating: createInvestigationMutation.isPending,
        isUpdating: updateInvestigationMutation.isPending,
        isDeleting: deleteInvestigationMutation.isPending,
        isStarting: startInvestigationMutation.isPending,
        isStopping: stopInvestigationMutation.isPending,
        isExporting: exportInvestigationMutation.isPending,
        
        // Error states
        error,
        createError: createInvestigationMutation.error,
        updateError: updateInvestigationMutation.error,
        deleteError: deleteInvestigationMutation.error,
        
        // Actions
        createInvestigation,
        updateInvestigation,
        deleteInvestigation,
        startInvestigation,
        stopInvestigation,
        exportInvestigation,
        refreshInvestigation,
        
        // Polling controls
        isPolling,
        togglePolling,
        
        // Status helpers
        isInProgress,
        isCompleted,
        isFailed,
        canStart,
        canStop
    };
};

/**
 * Hook for managing multiple investigations (list view)
 */
export const useInvestigations = (filters = {}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const {
        data: investigations = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['investigations', filters],
        queryFn: () => investigationService.getAllInvestigations(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Bulk operations
    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => investigationService.bulkDeleteInvestigations(ids),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['investigations'] });
            showToast(`Successfully deleted ${result.deleted} investigations`, 'success');
        },
        onError: (error) => {
            showToast(`Failed to delete investigations: ${error.message}`, 'error');
        }
    });

    const bulkExportMutation = useMutation({
        mutationFn: ({ ids, format }) => investigationService.bulkExportInvestigations(ids, format),
        onSuccess: () => {
            showToast('Investigations exported successfully', 'success');
        },
        onError: (error) => {
            showToast(`Failed to export investigations: ${error.message}`, 'error');
        }
    });

    const bulkDelete = useCallback((ids) => {
        return bulkDeleteMutation.mutateAsync(ids);
    }, [bulkDeleteMutation]);

    const bulkExport = useCallback((ids, format = 'pdf') => {
        return bulkExportMutation.mutateAsync({ ids, format });
    }, [bulkExportMutation]);

    return {
        investigations,
        isLoading,
        error,
        refetch,
        
        // Bulk operations
        bulkDelete,
        bulkExport,
        isBulkDeleting: bulkDeleteMutation.isPending,
        isBulkExporting: bulkExportMutation.isPending,
        
        // Computed values
        totalCount: investigations.length,
        activeCount: investigations.filter(inv => inv.status === 'IN_PROGRESS').length,
        completedCount: investigations.filter(inv => inv.status === 'COMPLETED').length,
        failedCount: investigations.filter(inv => inv.status === 'FAILED').length,
    };
};

export default useInvestigation;