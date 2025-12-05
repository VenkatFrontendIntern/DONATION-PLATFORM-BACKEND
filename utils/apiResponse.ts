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
 * Send an error API response
 * @param res Express Response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 400)
 * @param error Optional error details (only in development)
 */
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 400,
  error?: any
): void => {
  const response: ApiResponse = {
    status: 'error',
    message,
    data: null,
  };

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    (response as any).error = error.message || error;
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

