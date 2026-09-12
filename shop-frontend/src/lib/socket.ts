import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL.trim();
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const url = resolveSocketUrl();
    const token = localStorage.getItem('token') || undefined;

    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      // Re-authenticate when connected if token changed
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        socket!.auth = { token: currentToken };
      }
    });

    socket.on('connect_error', (err) => {
      // Gracefully handle connect error, socket.io will auto-retry
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Socket] Connection info:', err.message);
      }
    });
  }

  return socket;
}

export function updateSocketAuthToken(token?: string | null): void {
  if (socket) {
    socket.auth = { token: token || undefined };
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
