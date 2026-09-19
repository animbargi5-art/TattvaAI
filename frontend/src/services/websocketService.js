class WebSocketService {
    constructor() {
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second delay
        const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
        const defaultWsBase = apiBase.replace(/^http(s)?:\/\//, (match, s) => s ? 'wss://' : 'ws://') + '/ws';
        this.wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || defaultWsBase;
    }

    // Connect to investigation progress WebSocket
    connectToInvestigationProgress(investigationId, callbacks = {}) {
        const wsUrl = `${this.wsBaseUrl}/investigation/${investigationId}/progress`;
        const connectionKey = `investigation_${investigationId}`;
        
        return this._createConnection(connectionKey, wsUrl, callbacks);
    }

    // Connect to real-time dashboard updates
    connectToDashboard(callbacks = {}) {
        const wsUrl = `${this.wsBaseUrl}/dashboard/live`;
        const connectionKey = 'dashboard';
        
        return this._createConnection(connectionKey, wsUrl, callbacks);
    }

    // Connect to system health monitoring
    connectToSystemHealth(callbacks = {}) {
        const wsUrl = `${this.wsBaseUrl}/health/live`;
        const connectionKey = 'health';
        
        return this._createConnection(connectionKey, wsUrl, callbacks);
    }

    // Generic connection method
    _createConnection(connectionKey, wsUrl, callbacks = {}) {
        // Close existing connection if any
        this.disconnect(connectionKey);

        const ws = new WebSocket(wsUrl);
        const connection = {
            ws,
            callbacks,
            connected: false,
            connectionKey
        };

        // Set up event handlers
        ws.onopen = () => {
            console.log(`WebSocket connected: ${connectionKey}`);
            connection.connected = true;
            this.reconnectAttempts.set(connectionKey, 0);
            
            if (callbacks.onConnect) {
                callbacks.onConnect();
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (callbacks.onMessage) {
                    callbacks.onMessage(data);
                }

                // Handle specific message types
                if (data.type && callbacks[data.type]) {
                    callbacks[data.type](data);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
                if (callbacks.onError) {
                    callbacks.onError(error);
                }
            }
        };

        ws.onclose = (event) => {
            console.log(`WebSocket closed: ${connectionKey}`, event.code, event.reason);
            connection.connected = false;
            
            if (callbacks.onDisconnect) {
                callbacks.onDisconnect(event);
            }

            // Attempt to reconnect if not manually closed
            if (event.code !== 1000) {
                this._attemptReconnect(connectionKey, wsUrl, callbacks);
            }
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error: ${connectionKey}`, error);
            
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        };

        this.connections.set(connectionKey, connection);
        return connection;
    }

    // Attempt to reconnect with exponential backoff
    _attemptReconnect(connectionKey, wsUrl, callbacks) {
        const attempts = this.reconnectAttempts.get(connectionKey) || 0;
        
        if (attempts < this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, attempts);
            
            setTimeout(() => {
                console.log(`Attempting to reconnect WebSocket: ${connectionKey} (attempt ${attempts + 1})`);
                this.reconnectAttempts.set(connectionKey, attempts + 1);
                this._createConnection(connectionKey, wsUrl, callbacks);
            }, delay);
        } else {
            console.error(`Max reconnection attempts reached for: ${connectionKey}`);
            if (callbacks.onMaxReconnectAttemptsReached) {
                callbacks.onMaxReconnectAttemptsReached();
            }
        }
    }

    // Send message to specific connection
    send(connectionKey, data) {
        const connection = this.connections.get(connectionKey);
        
        if (connection && connection.connected && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(data));
            return true;
        }
        
        console.warn(`Cannot send message to ${connectionKey}: connection not ready`);
        return false;
    }

    // Disconnect specific connection
    disconnect(connectionKey) {
        const connection = this.connections.get(connectionKey);
        
        if (connection) {
            connection.ws.close(1000, 'Manual disconnect');
            this.connections.delete(connectionKey);
            this.reconnectAttempts.delete(connectionKey);
        }
    }

    // Disconnect all connections
    disconnectAll() {
        for (const [connectionKey] of this.connections) {
            this.disconnect(connectionKey);
        }
    }

    // Check if connection is active
    isConnected(connectionKey) {
        const connection = this.connections.get(connectionKey);
        return connection && connection.connected && connection.ws.readyState === WebSocket.OPEN;
    }

    // Get connection status
    getConnectionStatus(connectionKey) {
        const connection = this.connections.get(connectionKey);
        
        if (!connection) {
            return 'disconnected';
        }

        switch (connection.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
                return 'disconnecting';
            case WebSocket.CLOSED:
                return 'disconnected';
            default:
                return 'unknown';
        }
    }
}

export default new WebSocketService();