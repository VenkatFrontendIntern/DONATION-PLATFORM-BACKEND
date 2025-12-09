import { Request, Response } from 'express';
import { Category } from '../../models/Category.model.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;

    const category = await Category.create({
      name,
      description,
      icon,
    });

    sendSuccess(res, { category }, 'Category created successfully', 201);
  } catch (error: any) {
    logger.error('Create category error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    sendSuccess(res, { categories }, 'Categories retrieved successfully');
  } catch (error: any) {
    logger.error('Get all categories error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    sendSuccess(res, null, 'Category deleted successfully');
  } catch (error: any) {
    logger.error('Delete category error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

