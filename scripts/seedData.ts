import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Category } from '../models/Category.model.js';
import { logger } from '../utils/logger.js';

const seedCategories = async (): Promise<void> => {
  const categories = [
    { name: 'Medical', description: 'Medical and healthcare campaigns' },
    { name: 'Education', description: 'Education and scholarship campaigns' },
    { name: 'Disaster Relief', description: 'Disaster relief and emergency campaigns' },
    { name: 'Animal Welfare', description: 'Animal welfare and rescue campaigns' },
    { name: 'Environment', description: 'Environmental conservation campaigns' },
    { name: 'Other', description: 'Other charitable campaigns' },
  ];

  for (const cat of categories) {
    const existing = await Category.findOne({ name: cat.name });
    if (!existing) {
      await Category.create(cat);
      logger.info(`Created category: ${cat.name}`);
    }
  }
};

const runSeed = async (): Promise<void> => {
  try {
    await connectDB();
    await seedCategories();
    logger.info('Seed data completed');
    process.exit(0);
  } catch (error: any) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

runSeed();

