import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Campaign } from '../models/Campaign.model.js';
import { Donation } from '../models/Donation.model.js';
import { Category } from '../models/Category.model.js';
import { logger } from '../utils/logger.js';

const clearData = async (): Promise<void> => {
  try {
    await connectDB();
    
    await Campaign.deleteMany({});
    await Donation.deleteMany({});
    
    logger.info('Data cleared successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Clear data error:', error);
    process.exit(1);
  }
};

clearData();

