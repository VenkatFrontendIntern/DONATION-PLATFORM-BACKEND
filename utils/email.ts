import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn('Email not sent - SMTP not configured');
      return false;
    }

    await transporter.sendMail({
      from: `"Engala Trust" <${config.smtp.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info(`Email sent to ${options.to}`);
    return true;
  } catch (error: any) {
    logger.error('Error sending email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  resetUrl: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Password Reset - Engala Trust',
    html,
    text: `Password Reset Link: ${resetUrl}`,
  });
};

