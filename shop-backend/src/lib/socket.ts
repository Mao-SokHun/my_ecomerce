import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from frontend and mobile
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (socket.handshake.query?.token as string | undefined);

      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
            id: string;
            email: string;
            role: string;
            name?: string;
          };
          socket.user = decoded;
        } catch {
          // Token invalid, still allow connection as guest/public viewer
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    // Join public room
    socket.join('public');

    // If authenticated user
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
      if (socket.user.role === 'ADMIN') {
        socket.join('admin');
      }
    }

    // Allow listening to specific order (e.g. guest or user tracking /dashboard/orders/:id)
    socket.on('join:order', (orderId: string) => {
      if (orderId && typeof orderId === 'string') {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('leave:order', (orderId: string) => {
      if (orderId && typeof orderId === 'string') {
        socket.leave(`order:${orderId}`);
      }
    });

    // Allow listening to specific product details
    socket.on('join:product', (productId: string) => {
      if (productId && typeof productId === 'string') {
        socket.join(`product:${productId}`);
      }
    });

    socket.on('leave:product', (productId: string) => {
      if (productId && typeof productId === 'string') {
        socket.leave(`product:${productId}`);
      }
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

/**
 * Emit event to all connected admin clients
 */
export const emitToAdmin = (event: string, data: unknown): void => {
  try {
    if (io) {
      io.to('admin').emit(event, data);
    }
  } catch (err) {
    console.error(`Failed to emit to admin on event ${event}:`, err);
  }
};

/**
 * Emit event to a specific user
 */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  try {
    if (io && userId) {
      io.to(`user:${userId}`).emit(event, data);
    }
  } catch (err) {
    console.error(`Failed to emit to user ${userId} on event ${event}:`, err);
  }
};

/**
 * Emit event to anyone tracking a specific order
 */
export const emitToOrder = (orderId: string, event: string, data: unknown): void => {
  try {
    if (io && orderId) {
      io.to(`order:${orderId}`).emit(event, data);
    }
  } catch (err) {
    console.error(`Failed to emit to order ${orderId} on event ${event}:`, err);
  }
};

/**
 * Broadcast event to all connected clients (Public)
 */
export const broadcastRealtime = (event: string, data: unknown): void => {
  try {
    if (io) {
      io.emit(event, data);
    }
  } catch (err) {
    console.error(`Failed to broadcast event ${event}:`, err);
  }
};
