import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User.model.js';
import { config } from '../config/index.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

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

interface RefreshTokenBody {
  refreshToken: string;
}

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

// Generate Refresh Token
const generateRefreshToken = (id: string): string => {
  if (!config.jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }
  return jwt.sign({ id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  } as jwt.SignOptions);
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req: Request<{}, {}, SignupBody>, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, pan } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, 'User already exists with this email', 400);
      return;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      pan,
    });

    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

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
        refreshToken,
      },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    logger.error('Signup error:', error);
    sendError(res, 'Server error during signup', 500, error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      sendError(res, 'Email and password must be strings', 400);
      return;
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists and get password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    // Check password
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

    // Generate tokens
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

    // Save refresh token
    try {
      user.refreshToken = refreshToken;
      await user.save();
    } catch (saveError: any) {
      logger.error('Error saving refresh token:', saveError);
      // Continue anyway - tokens are generated, just not saved
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
        },
        token,
        refreshToken,
      },
      'Login successful'
    );
  } catch (error: any) {
    logger.error('Login error:', error);
    sendError(res, 'Server error during login', 500, error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
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
    sendError(res, 'Server error', 500, error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req: Request<{}, {}, RefreshTokenBody>, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

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

    sendSuccess(
      res,
      {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    sendError(res, 'Invalid or expired refresh token', 401, error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot
// @access  Public
export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordBody>, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      sendSuccess(res, null, 'If email exists, password reset link has been sent');
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, resetToken, resetUrl);

    sendSuccess(res, null, 'Password reset link sent to email');
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
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
    sendError(res, 'Server error', 500, error);
  }
};

