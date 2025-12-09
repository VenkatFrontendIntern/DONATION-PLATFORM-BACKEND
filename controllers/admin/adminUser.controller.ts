import { Request, Response } from 'express';
import { User } from '../../models/User.model.js';
import { logger } from '../../utils/logger.js';
import { sendError, sendPaginated } from '../../utils/apiResponse.js';
import { escapeRegex } from '../../utils/escapeRegex.js';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query: any = {};

    if (search) {
      // Sanitize search input to prevent NoSQL injection and ReDoS attacks
      const sanitizedSearch = escapeRegex(String(search));
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    sendPaginated(
      res,
      users,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
      'Users retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get all users error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

