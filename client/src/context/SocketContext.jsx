
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_MULTI_PLYR_SERVER_API || 'http://localhost:3001';

    console.log(`🔌 Connecting to socket server: ${serverUrl}`);

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Set socket immediately so components can use it
    setSocket(newSocket);

    // Make socket globally available for legacy components
    window.socket = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('✅ Socket connected with ID:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('❌ Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
    });

    // Add debug event to track socket activity
    newSocket.onAny((eventName, ...args) => {
      // Only log specific events to avoid console spam
      const importantEvents = [
        'join-game', 'player-joined', 'player-left',
        'game-state', 'questions-updated', 'questions-received',
        'save-questions', 'request-questions'
      ];

      if (importantEvents.includes(eventName)) {
        console.log(`📡 Socket event [${eventName}]:`, args);
      }
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
      setSocket(null);
      window.socket = null;
    };
  }, []);

  // Function to manually reconnect socket
  const reconnectSocket = () => {
    if (socket) {
      console.log('🔄 Manually reconnecting socket...');
      socket.disconnect();
      socket.connect();
    }
  };

  // Function to check socket health
  const checkSocketHealth = () => {
    if (!socket) return { connected: false, id: null, error: 'No socket instance' };

    return {
      connected: socket.connected,
      id: socket.id,
      isConnected: isConnected,
      error: connectionError
    };
  };

  // Provide socket and helper functions
  const contextValue = {
    socket,
    isConnected,
    connectionError,
    reconnectSocket,
    checkSocketHealth
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};