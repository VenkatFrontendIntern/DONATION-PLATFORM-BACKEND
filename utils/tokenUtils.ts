import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

interface JwtPayload {
  id: string;
}

/**
 * Generate JWT access token
 */
export const generateToken = (id: string): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT secret not configured');
  }
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  } as jwt.SignOptions);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (id: string): string => {
  if (!config.jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }
  return jwt.sign({ id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  } as jwt.SignOptions);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  if (!config.jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
};

/**
 * Cookie configuration for refresh token
 */
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production', // Only send over HTTPS in production
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  path: '/api/auth',
});

