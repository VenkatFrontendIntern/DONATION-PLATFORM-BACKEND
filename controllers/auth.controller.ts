import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User.model.js';
import { config } from '../config/index.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Cookie configuration for refresh token
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production', // Only send over HTTPS in production
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  path: '/api/auth',
});

interface SignupBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  pan?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// RefreshTokenBody is no longer needed as we read from cookies

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  password: string;
}

interface JwtPayload {
  id: string;
}

// Generate JWT Token
const generateToken = (id: string): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT secret not configured');
  }
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  } as jwt.SignOptions);
};

const generateRefreshToken = (id: string): string => {
  if (!config.jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }
  return jwt.sign({ id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  } as jwt.SignOptions);
};

export const signup = async (req: Request<{}, {}, SignupBody>, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, pan } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, 'User already exists with this email', 400);
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      pan,
    });

    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = refreshToken;
    await user.save();

    // Set refreshToken as httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions());

    sendSuccess(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || undefined,
        },
        token,
      },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    logger.error('Signup error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      sendError(res, 'Email and password must be strings', 400);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    let isMatch: boolean;
    try {
      isMatch = await user.comparePassword(password);
    } catch (compareError: any) {
      logger.error('Password comparison error:', compareError);
      sendError(res, 'Server error during login', 500, compareError);
      return;
    }

    if (!isMatch) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    let token: string;
    let refreshToken: string;
    try {
      token = generateToken(user._id.toString());
      refreshToken = generateRefreshToken(user._id.toString());
    } catch (tokenError: any) {
      logger.error('Token generation error:', tokenError);
      sendError(res, 'Server error during login', 500, tokenError);
      return;
    }

    try {
      user.refreshToken = refreshToken;
      await user.save();
    } catch (saveError: any) {
      logger.error('Error saving refresh token:', saveError);
    }

    // Set refreshToken as httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions());

    sendSuccess(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || undefined,
        },
        token,
      },
      'Login successful'
    );
  } catch (error: any) {
    logger.error('Login error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || undefined,
          phone: user.phone || undefined,
          pan: user.pan || undefined,
        },
      },
      'User retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get me error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refreshToken from httpOnly cookie instead of request body
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 401);
      return;
    }

    if (!config.jwtRefreshSecret) {
      sendError(res, 'JWT refresh secret not configured', 500);
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    const newToken = generateToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new refreshToken as httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, getCookieOptions());

    sendSuccess(
      res,
      {
        token: newToken,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    // Clear invalid refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getCookieOptions());
    sendError(res, undefined, 401, error);
  }
};

export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordBody>, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      sendSuccess(res, null, 'If email exists, password reset link has been sent');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, resetToken, resetUrl);

    sendSuccess(res, null, 'Password reset link sent to email');
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const resetPassword = async (req: Request<{}, {}, ResetPasswordBody>, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired reset token', 400);
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendSuccess(res, null, 'Password reset successful');
  } catch (error: any) {
    logger.error('Reset password error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear refreshToken cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getCookieOptions());
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error: any) {
    logger.error('Logout error:', error);
    sendError(res, undefined, 500, error);
  }
};

