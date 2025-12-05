import PDFDocument from 'pdfkit';
import { IDonation } from '../models/Donation.model.js';
import { logger } from '../utils/logger.js';

export const generateCertificate = async (donation: IDonation): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        info: {
          Title: '80G Tax Exemption Certificate',
          Author: 'Engala Trust',
          Subject: 'Tax Exemption Certificate under Section 80G',
        }
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Draw decorative border
      doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2))
         .lineWidth(2)
         .strokeColor('#1a1a1a')
         .stroke();

      // Inner border
      doc.rect(margin + 10, margin + 10, contentWidth - 20, pageHeight - (margin * 2) - 20)
         .lineWidth(1)
         .strokeColor('#666666')
         .stroke();

      // Top decorative line
      doc.moveTo(margin + 20, margin + 50)
         .lineTo(pageWidth - margin - 20, margin + 50)
         .lineWidth(2)
         .strokeColor('#2563eb')
         .stroke();

      // Header Section
      let yPosition = margin + 70;

      // Organization Logo/Name Section
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('ENGALA TRUST', margin + 20, yPosition, {
           align: 'center',
           width: contentWidth - 40,
         });

      yPosition += 35;

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Registered under Section 12A & 80G of Income Tax Act, 1961', margin + 20, yPosition, {
           align: 'center',
           width: contentWidth - 40,
         });

      yPosition += 25;

      // Certificate Title
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text('CERTIFICATE OF DONATION', margin + 20, yPosition, {
           align: 'center',
           width: contentWidth - 40,
         });

      yPosition += 30;

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('Under Section 80G of Income Tax Act, 1961', margin + 20, yPosition, {
           align: 'center',
           width: contentWidth - 40,
         });

      yPosition += 50;

      // Certificate Number Section
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Certificate Number:', margin + 30, yPosition);
      
      doc.fontSize(13)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text(donation.certificateNumber || 'N/A', margin + 30, yPosition + 15);

      yPosition += 50;

      // Main Content Box
      const boxY = yPosition;
      const boxHeight = 200;
      
      doc.rect(margin + 30, boxY, contentWidth - 60, boxHeight)
         .fillColor('#f8fafc')
         .fill()
         .strokeColor('#e2e8f0')
         .lineWidth(1)
         .stroke();

      // Content inside box
      let contentY = boxY + 25;

      // Date
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Date of Donation:', margin + 50, contentY);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text(new Date(donation.createdAt).toLocaleDateString('en-IN', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
         }), margin + 50, contentY + 15);

      contentY += 45;

      // Donor Name
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Name of Donor:', margin + 50, contentY);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text(donation.donorName, margin + 50, contentY + 15);

      contentY += 45;

      // Donor Email
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Email Address:', margin + 50, contentY);
      
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#1a1a1a')
         .text(donation.donorEmail, margin + 50, contentY + 15);

      contentY += 45;

      // Donation Amount
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Amount Donated:', margin + 50, contentY);
      
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#059669')
         .text(`₹${donation.amount.toLocaleString('en-IN')}`, margin + 50, contentY + 15);

      yPosition = boxY + boxHeight + 30;

      // Declaration Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('DECLARATION', margin + 30, yPosition);

      yPosition += 25;

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#374151')
         .text(
           'This is to certify that the above-mentioned donation of ₹' + 
           donation.amount.toLocaleString('en-IN') + 
           ' made by ' + donation.donorName + 
           ' on ' + new Date(donation.createdAt).toLocaleDateString('en-IN') + 
           ' is eligible for deduction under Section 80G of the Income Tax Act, 1961.',
           margin + 30,
           yPosition,
           {
             width: contentWidth - 60,
             align: 'justify',
             lineGap: 5,
           }
         );

      yPosition += 60;

      // Additional Information
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(
           'This certificate is issued for the purpose of claiming tax deduction under Section 80G of the Income Tax Act, 1961. ' +
           'Please retain this certificate for your records and submit it along with your Income Tax Return.',
           margin + 30,
           yPosition,
           {
             width: contentWidth - 60,
             align: 'justify',
             lineGap: 4,
           }
         );

      yPosition += 50;

      // Signature Section
      const signatureY = pageHeight - margin - 100;

      // Signature line
      doc.moveTo(margin + 30, signatureY)
         .lineTo(margin + 200, signatureY)
         .lineWidth(1)
         .strokeColor('#1a1a1a')
         .stroke();

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('Authorized Signatory', margin + 30, signatureY + 5);

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('ENGALA TRUST', margin + 30, signatureY + 25);

      // Organization Details on right
      const orgDetailsX = pageWidth - margin - 200;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('For any queries, please contact:', orgDetailsX, signatureY - 20, {
           width: 180,
         });

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('Email: support@engalatrust.org', orgDetailsX, signatureY - 5, {
           width: 180,
         });

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#9ca3af')
         .text(
           'This is a system-generated certificate. No signature is required.',
           margin + 20,
           pageHeight - margin - 20,
           {
             align: 'center',
             width: contentWidth - 40,
           }
         );

      doc.end();
    } catch (error: any) {
      logger.error('PDF generation error:', error);
      reject(error);
    }
  });
};

