import { Response } from 'express';

/**
 * Standard API Response Structure
 * 
 * Success Response:
 * {
 *   status: 'success' | 'error',
 *   message: string,
 *   data: any
 * }
 * 
 * Error Response:
 * {
 *   status: 'error',
 *   message: string,
 *   data: null
 * }
 */

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

/**
 * Send a successful API response
 * @param res Express Response object
 * @param data Response data
 * @param message Success message
 * @param statusCode HTTP status code (default: 200)
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  } as ApiResponse<T>);
};

/**
 * Extract user-friendly error message from various error types
 * @param error Error object (Mongoose, Validation, etc.)
 * @returns User-friendly error message
 */
export const extractErrorMessage = (error: any): string => {
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = error.errors || {};
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      return firstError.message;
    }
    return 'Validation failed. Please check your input.';
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    if (field) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different value.`;
    }
    return 'This record already exists.';
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return `Invalid ${error.path || 'data'} provided.`;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return 'Invalid authentication token.';
  }
  if (error.name === 'TokenExpiredError') {
    return 'Authentication token has expired. Please login again.';
  }

  // Custom error with message
  if (error.message) {
    return error.message;
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Send an error API response
 * @param res Express Response object
 * @param message Error message (optional, will extract from error if not provided)
 * @param statusCode HTTP status code (default: 400)
 * @param error Optional error object to extract message from
 */
export const sendError = (
  res: Response,
  message?: string,
  statusCode: number = 400,
  error?: any
): void => {
  // Extract user-friendly message if not provided
  const errorMessage = message || (error ? extractErrorMessage(error) : 'An error occurred');

  const response: ApiResponse = {
    status: 'error',
    message: errorMessage,
    data: null,
  };

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    (response as any).error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Send a paginated API response
 * @param res Express Response object
 * @param data Array of items
 * @param pagination Pagination metadata
 * @param message Success message
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  },
  message: string = 'Data retrieved successfully'
): void => {
  res.json({
    status: 'success',
    message,
    data: {
      items: data,
      pagination,
    },
  });
};

