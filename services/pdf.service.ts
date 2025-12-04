import PDFDocument from 'pdfkit';
import { IDonation } from '../models/Donation.model.js';
import { logger } from '../utils/logger.js';

export const generateCertificate = async (donation: IDonation): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Certificate Header
      doc.fontSize(20).text('80G TAX EXEMPTION CERTIFICATE', { align: 'center' });
      doc.moveDown();

      // Organization Details
      doc.fontSize(14).text('Engala Trust', { align: 'center' });
      doc.fontSize(12).text('Registration No: [Your Registration Number]', { align: 'center' });
      doc.moveDown(2);

      // Certificate Details
      doc.fontSize(12);
      doc.text(`Certificate Number: ${donation.certificateNumber || 'N/A'}`);
      doc.moveDown();
      doc.text(`Date: ${new Date(donation.createdAt).toLocaleDateString('en-IN')}`);
      doc.moveDown();
      doc.text(`Donor Name: ${donation.donorName}`);
      doc.moveDown();
      doc.text(`Donor Email: ${donation.donorEmail}`);
      doc.moveDown();
      doc.text(`Donation Amount: ₹${donation.amount.toLocaleString('en-IN')}`);
      doc.moveDown(2);

      // Declaration
      doc.fontSize(11);
      doc.text('This is to certify that the above-mentioned donation is eligible for tax deduction under Section 80G of the Income Tax Act, 1961.');
      doc.moveDown(2);

      // Footer
      doc.fontSize(10);
      doc.text('Authorized Signatory', { align: 'right' });
      doc.moveDown();
      doc.text('Engala Trust', { align: 'right' });

      doc.end();
    } catch (error: any) {
      logger.error('PDF generation error:', error);
      reject(error);
    }
  });
};

