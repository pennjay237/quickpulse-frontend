import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const pendingRooms = useRef([]);

  useEffect(() => {
    // USE ENVIRONMENT VARIABLE - THIS IS THE FIX
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    console.log('Creating socket connection to:', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: true,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsConnected(true);
      
      // Join any pending rooms that were requested before connection
      if (pendingRooms.current.length > 0) {
        console.log('Joining pending rooms:', pendingRooms.current);
        pendingRooms.current.forEach(({ roomType, data }) => {
          if (roomType === 'host') {
            newSocket.emit('host-join', data);
          } else if (roomType === 'participant') {
            newSocket.emit('participant-join', data);
          }
        });
        pendingRooms.current = [];
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket');
      newSocket.disconnect();
      newSocket.close();
    };
  }, []);

  const joinHostRoom = (hostId) => {
    if (socket && socket.connected) {
      console.log(`Host ${hostId} joining room`);
      socket.emit('host-join', hostId);
    } else {
      console.log(`Socket not connected yet, queueing host join for later`);
      pendingRooms.current.push({ roomType: 'host', data: hostId });
    }
  };

  const joinSessionRoom = (sessionCode, participantId, participantName) => {
    if (socket && socket.connected) {
      console.log(`Participant ${participantName} joining session_${sessionCode}`);
      socket.emit('participant-join', { sessionCode, participantId, participantName });
    } else {
      console.log(`Socket not connected yet, queueing participant join for later`);
      pendingRooms.current.push({ 
        roomType: 'participant', 
        data: { sessionCode, participantId, participantName }
      });
    }
  };

  const emitPollPublished = (poll, sessionCode) => {
    if (socket && socket.connected) {
      console.log(`Emitting poll-published for session ${sessionCode}`);
      socket.emit('poll-published', { poll, sessionCode });
    } else {
      console.warn('Socket not connected, cannot emit poll-published');
    }
  };

  const emitPollClosed = (pollId, sessionCode) => {
    if (socket && socket.connected) {
      console.log(`Emitting poll-closed for poll ${pollId}`);
      socket.emit('poll-closed', { pollId, sessionCode });
    } else {
      console.warn('Socket not connected, cannot emit poll-closed');
    }
  };

  const emitPollReopened = (poll, sessionCode) => {
    if (socket && socket.connected) {
      console.log(`Emitting poll-reopened for poll ${poll.id}`);
      socket.emit('poll-reopened', { poll, sessionCode });
    } else {
      console.warn('Socket not connected, cannot emit poll-reopened');
    }
  };

  const emitResponse = (pollId, answer, participantName, sessionCode) => {
    if (socket && socket.connected) {
      console.log(`Emitting new-response for poll ${pollId}`);
      socket.emit('new-response', { pollId, answer, participantName, sessionCode });
    } else {
      console.warn('Socket not connected, cannot emit response');
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinHostRoom,
      joinSessionRoom,
      emitPollPublished,
      emitPollClosed,
      emitPollReopened,
      emitResponse
    }}>
      {children}
    </SocketContext.Provider>
  );
};