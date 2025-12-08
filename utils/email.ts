import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  useTemplate?: boolean; // If false, skip template wrapping
}

const createTransporter = () => {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    logger.warn('SMTP not configured. Email functionality will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: Number(config.smtp.port) || 587,
    secure: false,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
};

/**
 * Base email template wrapper
 * Creates a professional, responsive email layout matching the website design
 */
export const getEmailTemplate = (content: string): string => {
  const currentYear = new Date().getFullYear();
  const supportEmail = config.smtp.user || 'support@engalatrust.org';
  const frontendUrl = config.frontendUrl || 'https://engalatrust.org';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Engala Trust</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ❤️ Engala Trust
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px; font-weight: 400;">
                      Empowering change through transparent giving
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                      © ${currentYear} Engala Trust. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                      Made with <span style="color: #10b981;">❤️</span> by Engala Trust
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0;">
                      <a href="mailto:${supportEmail}" style="color: #10b981; text-decoration: none; font-size: 13px; font-weight: 500;">
                        ${supportEmail}
                      </a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid #334155; padding-top: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://facebook.com" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Facebook</a>
                        </td>
                        <td style="padding: 0 8px; color: #94a3b8;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://twitter.com" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Twitter</a>
                        </td>
                        <td style="padding: 0 8px; color: #94a3b8;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://instagram.com" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Instagram</a>
                        </td>
                        <td style="padding: 0 8px; color: #94a3b8;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="${frontendUrl}" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Visit Website</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn('Email not sent - SMTP not configured');
      return false;
    }

    // Automatically wrap HTML with template unless explicitly disabled
    const html = options.useTemplate === false ? options.html : getEmailTemplate(options.html);

    await transporter.sendMail({
      from: `"Engala Trust" <${config.smtp.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html,
    });

    logger.info(`Email sent to ${options.to}`);
    return true;
  } catch (error: any) {
    logger.error('Error sending email:', error);
    return false;
  }
};

/**
 * Password Reset Email Template
 * Clean, secure, and urgent design with prominent CTA button
 */
export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  resetUrl: string
): Promise<boolean> => {
  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td>
          <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">
            Password Reset Request
          </h2>
          <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password for your Engala Trust account. Click the button below to create a new password.
          </p>
          
          <!-- CTA Button -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
            <tr>
              <td align="center" style="padding: 16px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.25);">
                  Reset Password
                </a>
              </td>
            </tr>
          </table>

          <!-- Fallback Link -->
          <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 8px 0 24px 0; word-break: break-all;">
            <a href="${resetUrl}" style="color: #059669; text-decoration: underline; font-size: 14px;">
              ${resetUrl}
            </a>
          </p>

          <!-- Security Warning -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: 500;">
                  ⚠️ Security Notice: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </td>
            </tr>
          </table>

          <!-- Expiry Notice -->
          <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            This password reset link will expire in <strong style="color: #111827;">1 hour</strong> for security reasons.
          </p>
        </td>
      </tr>
    </table>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - Engala Trust',
    html: content,
    text: `Password Reset Link: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
  });
};

