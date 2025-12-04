import { Request, Response } from 'express';
import { generateUPIQR } from '../services/upi.service.js';
import { logger } from '../utils/logger.js';

interface GenerateQRBody {
  campaignId: string;
  amount: number;
  donorName: string;
  donorEmail: string;
}

export const generateQR = async (req: Request<{}, {}, GenerateQRBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { campaignId, amount, donorName, donorEmail } = req.body;

    const result = await generateUPIQR({
      campaignId,
      amount,
      donorName,
      donorEmail,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Generate QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

