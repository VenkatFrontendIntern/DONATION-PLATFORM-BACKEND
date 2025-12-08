import { Request, Response } from 'express';
import { Newsletter } from '../models/Newsletter.model.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { Campaign } from '../models/Campaign.model.js';
import { sendWelcomeEmail, sendNewsletterBatch, generateCampaignUpdateContent } from '../services/newsletter.service.js';
import { createNewsletterEmailContent } from '../utils/newsletterEmailTemplates.js';

interface SubscribeNewsletterBody {
  email: string;
}

export const subscribeNewsletter = async (req: Request<{}, {}, SubscribeNewsletterBody>, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, 'Email is required', 400);
      return;
    }

    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase().trim() });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        sendError(res, 'You are already subscribed to our newsletter', 400);
        return;
      } else {
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        await sendWelcomeEmail(email);

        sendSuccess(res, { email }, 'Successfully resubscribed to newsletter');
        return;
      }
    }

    const subscriber = await Newsletter.create({
      email: email.toLowerCase().trim(),
      isActive: true,
      subscribedAt: new Date(),
    });

    logger.info(`New newsletter subscription: ${email}`);

    await sendWelcomeEmail(email);

    sendSuccess(res, { email: subscriber.email }, 'Successfully subscribed to newsletter');
  } catch (error: any) {
    logger.error('Newsletter subscription error:', error);
    
    if (error.code === 11000) {
      sendError(res, 'You are already subscribed to our newsletter', 400);
      return;
    }

    sendError(res, undefined, 500, error);
  }
};

export const unsubscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      sendError(res, 'Email is required', 400);
      return;
    }

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase().trim() });

    if (!subscriber) {
      sendError(res, 'Email not found in our newsletter list', 404);
      return;
    }

    if (!subscriber.isActive) {
      sendError(res, 'You are already unsubscribed', 400);
      return;
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    logger.info(`Newsletter unsubscription: ${email}`);

    sendSuccess(res, { email }, 'Successfully unsubscribed from newsletter');
  } catch (error: any) {
    logger.error('Newsletter unsubscription error:', error);
    sendError(res, undefined, 500, error);
  }
};


export const sendNewsletterToSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, content, campaignId } = req.body;

    if (!subject || !content) {
      sendError(res, 'Subject and content are required', 400);
      return;
    }

    const subscribers = await Newsletter.find({ isActive: true }).select('email');
    
    if (subscribers.length === 0) {
      sendError(res, 'No active subscribers found', 404);
      return;
    }

    let campaignData = null;
    if (campaignId) {
      campaignData = await Campaign.findById(campaignId).select('title description coverImage raisedAmount goalAmount');
    }

    const newsletterContent = createNewsletterEmailContent(content, campaignData);

    const { successCount, failCount } = await sendNewsletterBatch(
      subscribers,
      subject,
      newsletterContent,
      10
    );

    logger.info(`Newsletter sent: ${successCount} successful, ${failCount} failed out of ${subscribers.length} subscribers`);

    sendSuccess(
      res,
      {
        totalSubscribers: subscribers.length,
        successCount,
        failCount,
      },
      `Newsletter sent to ${successCount} subscribers`
    );
  } catch (error: any) {
    logger.error('Send newsletter error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const sendCampaignUpdateNewsletter = async (
  campaignId: string,
  updateType: 'new' | 'milestone' | 'completed'
): Promise<void> => {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('category', 'name')
      .select('title description coverImage raisedAmount goalAmount status createdAt');

    if (!campaign) {
      logger.warn(`Campaign ${campaignId} not found for newsletter update`);
      return;
    }

    const subscribers = await Newsletter.find({ isActive: true }).select('email');
    
    if (subscribers.length === 0) {
      return;
    }

    const { subject, content } = generateCampaignUpdateContent(campaign, updateType);
    const newsletterContent = createNewsletterEmailContent(content, campaign);

    sendNewsletterBatch(subscribers, subject, newsletterContent, 10).catch((error: any) => {
      logger.error('Failed to send campaign update newsletter:', error);
    });
  } catch (error: any) {
    logger.error('Send campaign update newsletter error:', error);
  }
};


