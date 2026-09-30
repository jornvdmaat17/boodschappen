import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../api/client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ auth: { token: getToken() } });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function useListRoom(listId: number | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!listId) return;
    const s = getSocket();
    s.emit('join_list', listId);
    const handler = () => onUpdate();
    s.on('list:updated', handler);
    s.on('list:item_toggled', handler);
    return () => {
      s.emit('leave_list', listId);
      s.off('list:updated', handler);
      s.off('list:item_toggled', handler);
    };
  }, [listId]);
}
