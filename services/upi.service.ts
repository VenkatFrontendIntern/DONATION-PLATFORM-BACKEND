import { logger } from '../utils/logger.js';

interface GenerateQRData {
  campaignId: string;
  amount: number;
  donorName: string;
  donorEmail: string;
}

export const generateUPIQR = async (data: GenerateQRData): Promise<{ qrCode: string; upiId: string }> => {
  try {
    const upiId = 'engalatrust@paytm';
    const qrData = `upi://pay?pa=${upiId}&am=${data.amount}&cu=INR&tn=Donation for Campaign ${data.campaignId}`;
    
    return {
      qrCode: qrData,
      upiId,
    };
  } catch (error: any) {
    logger.error('UPI QR generation error:', error);
    throw error;
  }
};

