import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinWhatsappRoom(softwareId: string): void {
  const s = getSocket();
  s.emit('join_whatsapp', softwareId);
}

export function leaveWhatsappRoom(softwareId: string): void {
  const s = getSocket();
  s.emit('leave_whatsapp', softwareId);
}

export function joinSaas(saas: string): void {
  const s = getSocket();
  s.emit('join_saas', saas);
}

export function leaveSaas(saas: string): void {
  const s = getSocket();
  s.emit('leave_saas', saas);
}
