import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for WebSocket connections
 * Provides real-time communication with automatic reconnection
 */
export const useWebSocket = (url, options = {}) => {
    const {
        onMessage,
        onOpen,
        onClose,
        onError,
        reconnectAttempts = 5,
        reconnectInterval = 3000,
        heartbeatInterval = 30000,
        enableHeartbeat = true,
        protocols = []
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, reconnecting
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const reconnectCountRef = useRef(0);
    const isManualCloseRef = useRef(false);

    // Send message function
    const sendMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            wsRef.current.send(messageStr);
            return true;
        }
        console.warn('WebSocket is not connected. Cannot send message:', message);
        return false;
    }, []);

    // Close connection function
    const closeConnection = useCallback(() => {
        isManualCloseRef.current = true;
        if (wsRef.current) {
            wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }
    }, []);

    // Heartbeat functionality
    const startHeartbeat = useCallback(() => {
        if (!enableHeartbeat) return;

        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                sendMessage({ type: 'ping', timestamp: Date.now() });
            }
        }, heartbeatInterval);
    }, [enableHeartbeat, heartbeatInterval, sendMessage]);

    const stopHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    // Connect function
    const connect = useCallback(() => {
        if (!url) return;

        setConnectionStatus('connecting');
        setError(null);

        try {
            const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
            const defaultWsHost = import.meta.env.VITE_WS_BASE_URL || apiBase.replace(/^http(s)?:\/\//, (match, s) => s ? 'wss://' : 'ws://');
            const wsUrl = url.startsWith('ws') ? url : `${defaultWsHost}${url.startsWith('/') ? '' : '/'}${url}`;
            wsRef.current = new WebSocket(wsUrl, protocols);

            wsRef.current.onopen = (event) => {
                setIsConnected(true);
                setConnectionStatus('connected');
                setError(null);
                reconnectCountRef.current = 0;
                
                startHeartbeat();
                onOpen?.(event);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    
                    // Handle pong messages for heartbeat
                    if (data.type === 'pong') {
                        return; // Don't pass pong messages to the callback
                    }
                    
                    onMessage?.(data);
                } catch (parseError) {
                    // If it's not JSON, treat as plain text
                    setLastMessage(event.data);
                    onMessage?.(event.data);
                }
            };

            wsRef.current.onclose = (event) => {
                setIsConnected(false);
                stopHeartbeat();
                
                if (isManualCloseRef.current) {
                    setConnectionStatus('disconnected');
                    isManualCloseRef.current = false;
                } else {
                    setConnectionStatus('reconnecting');
                    attemptReconnect();
                }
                
                onClose?.(event);
            };

            wsRef.current.onerror = (event) => {
                const errorMsg = 'WebSocket connection error';
                setError(errorMsg);
                onError?.(errorMsg);
            };

        } catch (connectionError) {
            const errorMsg = `Failed to create WebSocket connection: ${connectionError.message}`;
            setError(errorMsg);
            setConnectionStatus('disconnected');
            onError?.(errorMsg);
        }
    }, [url, protocols, onOpen, onMessage, onClose, onError, startHeartbeat, stopHeartbeat]);

    // Reconnect logic
    const attemptReconnect = useCallback(() => {
        if (reconnectCountRef.current >= reconnectAttempts) {
            setConnectionStatus('disconnected');
            setError('Maximum reconnection attempts reached');
            return;
        }

        reconnectCountRef.current += 1;
        
        reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManualCloseRef.current) {
                connect();
            }
        }, reconnectInterval * reconnectCountRef.current); // Exponential backoff
    }, [reconnectAttempts, reconnectInterval, connect]);

    // Manual reconnect function
    const reconnect = useCallback(() => {
        closeConnection();
        setTimeout(() => {
            isManualCloseRef.current = false;
            reconnectCountRef.current = 0;
            connect();
        }, 100);
    }, [closeConnection, connect]);

    // Initialize connection
    useEffect(() => {
        if (url) {
            connect();
        }

        return () => {
            closeConnection();
        };
    }, [url]); // Only reconnect when URL changes

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            closeConnection();
        };
    }, [closeConnection]);

    return {
        // Connection state
        isConnected,
        connectionStatus,
        error,
        
        // Data
        lastMessage,
        
        // Actions
        sendMessage,
        closeConnection,
        reconnect,
        
        // Connection info
        reconnectCount: reconnectCountRef.current,
        maxReconnectAttempts: reconnectAttempts,
        
        // WebSocket instance (use with caution)
        ws: wsRef.current
    };
};

/**
 * Hook for subscribing to specific WebSocket channels/topics
 */
export const useWebSocketSubscription = (url, topic, options = {}) => {
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const { isConnected, sendMessage, ...wsProps } = useWebSocket(url, {
        ...options,
        onMessage: (data) => {
            // Handle subscription-specific messages
            if (data.topic === topic || data.channel === topic) {
                setSubscriptionData(data.payload || data.data || data);
            }
            // Also call the original onMessage if provided
            options.onMessage?.(data);
        },
        onOpen: (event) => {
            // Auto-subscribe when connection opens
            subscribe();
            options.onOpen?.(event);
        }
    });

    const subscribe = useCallback(() => {
        if (isConnected && sendMessage) {
            const success = sendMessage({
                type: 'subscribe',
                topic: topic,
                timestamp: Date.now()
            });
            setIsSubscribed(success);
        }
    }, [isConnected, sendMessage, topic]);

    const unsubscribe = useCallback(() => {
        if (isConnected && sendMessage) {
            sendMessage({
                type: 'unsubscribe',
                topic: topic,
                timestamp: Date.now()
            });
            setIsSubscribed(false);
            setSubscriptionData(null);
        }
    }, [isConnected, sendMessage, topic]);

    // Subscribe when connected
    useEffect(() => {
        if (isConnected && !isSubscribed) {
            subscribe();
        }
    }, [isConnected, isSubscribed, subscribe]);

    return {
        ...wsProps,
        isConnected,
        sendMessage,
        
        // Subscription-specific
        subscriptionData,
        isSubscribed,
        subscribe,
        unsubscribe,
        topic
    };
};

export default useWebSocket;