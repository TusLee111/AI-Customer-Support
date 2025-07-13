import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, STORAGE_KEYS } from '../config';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // This effect should only re-run when the user's ID changes (login/logout),
    // not on every re-render where the user object reference might be new.
    if (user?.id) {
      console.log(`SocketContext: User ${user.id} detected. Attempting to establish connection.`);

      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        console.error("Socket connection failed: User is present, but token is missing from local storage.");
        return; // Abort if no token
      }

      // Create a new socket connection
      const newSocket = io(API_BASE_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket'],
        auth: { token },
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('SocketContext: Connection successful. Socket ID:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('SocketContext: Disconnected. Reason:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('SocketContext: Connection Error ->', error.message);
        setIsConnected(false);
      });

      // The cleanup function will run ONLY when user.id changes (i.e., on logout)
      return () => {
        console.log(`SocketContext: Cleaning up connection for user ${user.id}.`);
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // This block runs on initial load when user is null, and on logout.
      console.log("SocketContext: No user detected. Ensuring no active socket connection.");
    }
  }, [user?.id]); // <-- CRITICAL FIX: Depend on the stable ID, not the object reference.

  // Emit typing event
  const emitTyping = (roomId) => {
    if (socket && user && roomId) {
      socket.emit('typing', { room_id: roomId, user_id: user.id, user_type: 'customer' });
    }
  };
  // Emit stop_typing event
  const emitStopTyping = (roomId) => {
    if (socket && user && roomId) {
      socket.emit('stop_typing', { room_id: roomId, user_id: user.id, user_type: 'customer' });
    }
  };
  // Emit seen event
  const emitSeen = (roomId, lastMessageId) => {
    if (socket && user && roomId && lastMessageId) {
      socket.emit('seen', { room_id: roomId, user_id: user.id, user_type: 'customer', last_message_id: lastMessageId });
    }
  };

  const value = useMemo(() => ({ socket, isConnected, emitTyping, emitStopTyping, emitSeen }), [socket, isConnected]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 