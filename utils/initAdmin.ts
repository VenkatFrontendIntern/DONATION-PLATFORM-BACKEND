import { User } from '../models/User.model.js';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const initializeAdmin = async (): Promise<void> => {
  try {
    const adminEmail = config.adminEmail;
    const adminPassword = config.adminPassword;

    if (!adminEmail || !adminPassword) {
      logger.warn('Admin email or password not configured. Skipping admin initialization.');
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      logger.info('Admin user created successfully');
    } else {
      logger.info('Admin user already exists');
    }
  } catch (error: any) {
    logger.error('Error initializing admin:', error);
  }
};

