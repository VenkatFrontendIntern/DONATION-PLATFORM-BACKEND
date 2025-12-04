import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, IUser } from '../models/User.model.js';
import { logger } from '../utils/logger.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  id: string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!config.jwtSecret) {
      res.status(500).json({ message: 'JWT secret not configured' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.warn(`Authentication failed: ${error.message || 'Invalid or expired token'} for route ${req.path}`);
    res.status(401).json({ 
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn(`Authorization failed: No user found for route ${req.path}`);
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user._id} (role: ${req.user.role}) attempted to access ${req.path} requiring roles: ${roles.join(', ')}`);
      res.status(403).json({ 
        message: `Access denied. This endpoint requires one of the following roles: ${roles.join(', ')}. Your current role is: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

