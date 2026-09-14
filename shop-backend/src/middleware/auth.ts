import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
      name: string;
      tokenVersion?: number;
    };

    const user = await prisma.user.findFirst({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true, name: true, isActive: true, tokenVersion: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    if (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({ success: false, message: 'Token has been revoked' });
      return;
    }

    req.user = { id: user.id, email: user.email || '', role: user.role, name: user.name };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CASHIER', 'WAREHOUSE'];

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
};

export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, message: 'Super Admin access required' });
    return;
  }
  next();
};

export const requireStoreAdminOrSuper = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN')) {
    res.status(403).json({ success: false, message: 'Store Admin or Super Admin access required' });
    return;
  }
  next();
};

export const requireOrderAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const allowed = ['SUPER_ADMIN', 'ADMIN', 'CASHIER'];
  if (!req.user || !allowed.includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Warehouse staff is not authorized to access orders' });
    return;
  }
  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        role: string;
        name: string;
        tokenVersion?: number;
      };
      const user = await prisma.user.findFirst({
        where: { id: decoded.id, isActive: true },
        select: { id: true, email: true, role: true, name: true, tokenVersion: true },
      });
      if (user && (typeof decoded.tokenVersion !== 'number' || decoded.tokenVersion === user.tokenVersion)) {
        req.user = { id: user.id, email: user.email || '', role: user.role, name: user.name };
      }
    }
  } catch {
    // Optional auth, ignore invalid tokens
  }
  next();
};
