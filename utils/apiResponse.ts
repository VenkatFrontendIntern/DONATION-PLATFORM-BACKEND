import { Response } from 'express';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: number = 200
): void => {
  // Prevent sending response if headers already sent
  if (res.headersSent) {
    return;
  }
  
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  } as ApiResponse<T>);
};

export const extractErrorMessage = (error: any): string => {
  if (error.name === 'ValidationError') {
    const errors = error.errors || {};
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      return firstError.message;
    }
    return 'Validation failed. Please check your input.';
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    if (field) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different value.`;
    }
    return 'This record already exists.';
  }

  if (error.name === 'CastError') {
    return `Invalid ${error.path || 'data'} provided.`;
  }

  if (error.name === 'JsonWebTokenError') {
    return 'Invalid authentication token.';
  }
  if (error.name === 'TokenExpiredError') {
    return 'Authentication token has expired. Please login again.';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

export const sendError = (
  res: Response,
  message?: string,
  statusCode: number = 400,
  error?: any
): void => {
  // Prevent sending response if headers already sent
  if (res.headersSent) {
    return;
  }
  
  const errorMessage = message || (error ? extractErrorMessage(error) : 'An error occurred');

  const response: ApiResponse = {
    status: 'error',
    message: errorMessage,
    data: null,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    (response as any).error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  res.status(statusCode).json(response);
};

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
  // Prevent sending response if headers already sent
  if (res.headersSent) {
    return;
  }
  
  res.json({
    status: 'success',
    message,
    data: {
      items: data,
      pagination,
    },
  });
};

