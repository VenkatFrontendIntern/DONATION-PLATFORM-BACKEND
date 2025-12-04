import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, IUser } from '../models/User.model.js';

interface JwtPayload {
  id: string;
}

// Optional authentication - doesn't fail if no token, but sets req.user if valid token exists
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      next(); // No token, continue without setting req.user
      return;
    }

    if (!config.jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Invalid token, but continue anyway (optional auth)
    next();
  }
};

