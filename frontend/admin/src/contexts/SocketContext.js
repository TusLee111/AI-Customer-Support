import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, STORAGE_KEYS } from '../config';
import { useAuth } from './AuthContext';
import notificationSound from '../assets/notification.mp3';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Using refs to hold handlers and subscriptions to avoid re-renders
    const eventHandlers = useRef({});
    const notificationAudioRef = useRef(null);
    const lastPlayTimeRef = useRef(0);

    useEffect(() => {
        // Only connect if the user is logged in and there's no active socket
        if (user && !socket) {
            console.log("Admin SocketContext: Attempting to connect...");
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
            console.log('[SocketContext] Token:', token);
            if (!token) {
                console.error('Admin SocketContext: No auth token found. Cannot connect.');
                return;
            }
            
            const newSocket = io(API_BASE_URL, {
                reconnectionAttempts: 5,
                reconnectionDelay: 5000,
                transports: ['websocket'],
                auth: {
                    token: token,
                },
            });

            newSocket.on('connect', () => {
                console.log('Admin SocketContext: Connected with ID:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', (reason) => {
                console.warn('[SocketContext] Disconnected:', reason);
                setIsConnected(false);
            });

            newSocket.on('connect_error', (err) => {
                console.error('[SocketContext] connect_error:', err);
                setIsConnected(false);
            });

            setSocket(newSocket);
        }

        // Cleanup on component unmount or user logout
        return () => {
            if (socket) {
                console.log("Admin SocketContext: Disconnecting socket.");
                socket.disconnect();
                setSocket(null);
            }
        };
        // The dependency array ensures this effect runs only when the user object changes.
    }, [user]);

    const joinRoom = useCallback((roomId) => {
        if (!socket || !user) return;
        socket.emit('join_room', {
            room_id: roomId,
            user_id: user.id,
            user_type: 'admin'
        });
    }, [socket, user]);

    const leaveRoom = useCallback((roomId) => {
        if (!socket || !user) return;
        socket.emit('leave_room', {
            room_id: roomId,
        });
    }, [socket, user]);

    const sendMessage = useCallback((roomId, content, replyToId = null) => {
        if (!socket || !user) return;
        
        const payload = {
            room_id: roomId,
            user_id: user.id,
            user_type: 'admin',
            content: content
        };

        if (replyToId) {
            payload.reply_to = replyToId;
        }

        console.log("Admin SocketContext: Sending message with payload:", payload);
        socket.emit('send_message', payload);
    }, [socket, user]);

    const subscribeToEvent = useCallback((event, handler) => {
        if (!eventHandlers.current[event]) {
            eventHandlers.current[event] = new Set();
        }
        eventHandlers.current[event].add(handler);
        socket?.on(event, handler);

        return () => {
            eventHandlers.current[event]?.delete(handler);
            socket?.off(event, handler);
        };
    }, [socket]);

    // Emit typing event
    const emitTyping = useCallback((roomId) => {
        if (socket && user && roomId) {
            socket.emit('typing', { room_id: roomId, user_id: user.id, user_type: 'admin' });
        }
    }, [socket, user]);
    // Emit stop_typing event
    const emitStopTyping = useCallback((roomId) => {
        if (socket && user && roomId) {
            socket.emit('stop_typing', { room_id: roomId, user_id: user.id, user_type: 'admin' });
        }
    }, [socket, user]);
    // Emit seen event
    const emitSeen = useCallback((roomId, lastMessageId) => {
        if (socket && user && roomId && lastMessageId) {
            socket.emit('seen', { room_id: roomId, user_id: user.id, user_type: 'admin', last_message_id: lastMessageId });
        }
    }, [socket, user]);

    useEffect(() => {
        if (!socket) return;
        // Lắng nghe new_message toàn cục
        const handleNewMessage = (message) => {
            if (message.user_type === 'customer') {
                const now = Date.now();
                if (now - lastPlayTimeRef.current > 5000) {
                    notificationAudioRef.current?.play();
                    lastPlayTimeRef.current = now;
                }
            }
        };
        socket.on('new_message', handleNewMessage);
        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket]);

    const value = {
        socket,
        isConnected,
        joinRoom,
        leaveRoom,
        sendMessage,
        subscribeToEvent,
        emitTyping,
        emitStopTyping,
        emitSeen
    };

    return (
        <SocketContext.Provider value={value}>
            <audio ref={notificationAudioRef} src={notificationSound} preload="auto" />
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext; 