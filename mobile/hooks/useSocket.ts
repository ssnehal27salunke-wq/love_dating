import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = 'http://192.168.2.4:3000';

export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('join_match', { match_id: matchId });
  }, []);

  const sendMessage = useCallback((matchId: string, content: string, tempId: string) => {
    socketRef.current?.emit('send_message', {
      match_id: matchId,
      content,
      message_type: 'text',
      temp_id: tempId,
    });
  }, []);

  const startTyping = useCallback((matchId: string) => {
    socketRef.current?.emit('typing_start', { match_id: matchId });
  }, []);

  const stopTyping = useCallback((matchId: string) => {
    socketRef.current?.emit('typing_stop', { match_id: matchId });
  }, []);

  const markRead = useCallback((matchId: string, messageIds: string[]) => {
    socketRef.current?.emit('mark_read', { match_id: matchId, message_ids: messageIds });
  }, []);

  return {
    socket: socketRef.current,
    joinMatch,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
  };
}
