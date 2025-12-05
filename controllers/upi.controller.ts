import { Request, Response } from 'express';
import { generateUPIQR } from '../services/upi.service.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

interface GenerateQRBody {
  campaignId: string;
  amount: number;
  donorName: string;
  donorEmail: string;
}

export const generateQR = async (req: Request<{}, {}, GenerateQRBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { campaignId, amount, donorName, donorEmail } = req.body;

    const result = await generateUPIQR({
      campaignId,
      amount,
      donorName,
      donorEmail,
    });

    sendSuccess(res, result, 'UPI QR code generated successfully');
  } catch (error: any) {
    logger.error('Generate QR error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

