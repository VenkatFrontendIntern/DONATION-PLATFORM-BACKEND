import { Newsletter } from '../models/Newsletter.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { sendEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { generateWelcomeEmailTemplate, createNewsletterEmailContent } from '../utils/newsletterEmailTemplates.js';

/**
 * Send welcome email to new subscriber
 */
export const sendWelcomeEmail = async (email: string): Promise<void> => {
  const welcomeEmailContent = generateWelcomeEmailTemplate();

  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Engala Trust Newsletter! 🎉',
      html: welcomeEmailContent,
    });
  } catch (error: any) {
    logger.error('Failed to send welcome email:', error);
  }
};

/**
 * Send newsletter to subscribers in batches
 */
export const sendNewsletterBatch = async (
  subscribers: Array<{ email: string }>,
  subject: string,
  content: string,
  batchSize: number = 10
): Promise<{ successCount: number; failCount: number }> => {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (subscriber) => {
        try {
          await sendEmail({
            to: subscriber.email,
            subject,
            html: content,
          });
          successCount++;
        } catch (error: any) {
          logger.error(`Failed to send newsletter to ${subscriber.email}:`, error);
          failCount++;
        }
      })
    );

    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { successCount, failCount };
};

/**
 * Generate campaign update content based on update type
 */
export const generateCampaignUpdateContent = (
  campaign: any,
  updateType: 'new' | 'milestone' | 'completed'
): { subject: string; content: string } => {
  let subject = '';
  let content = '';

  switch (updateType) {
    case 'new':
      subject = `🎉 New Campaign: ${campaign.title}`;
      content = `
        <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
          Exciting News! A New Campaign Has Launched
        </p>
        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
          We're thrilled to announce a new campaign that needs your support!
        </p>
      `;
      break;
    case 'milestone':
      const progressPercentage = Math.round((campaign.raisedAmount / campaign.goalAmount) * 100);
      subject = `🎯 Campaign Milestone: ${campaign.title} reached ${progressPercentage}%!`;
      content = `
        <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
          Campaign Milestone Reached!
        </p>
        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
          Great progress! This campaign has reached ${progressPercentage}% of its goal. Your support is making a difference!
        </p>
      `;
      break;
    case 'completed':
      subject = `✅ Campaign Completed: ${campaign.title}`;
      content = `
        <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
          Campaign Goal Achieved!
        </p>
        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
          Amazing news! This campaign has successfully reached its goal. Thank you to everyone who contributed!
        </p>
      `;
      break;
  }

  return { subject, content };
};

