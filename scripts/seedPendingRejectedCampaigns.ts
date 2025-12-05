import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Campaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../utils/logger.js';

const pendingCampaigns = [
  {
    title: 'Help Build Community Center',
    description: 'We need funds to build a community center that will serve as a hub for local activities, education, and social gatherings.',
    organizer: 'Community Development Society',
    goalAmount: 800000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    donorCount: 0,
  },
  {
    title: 'Support Elderly Care Home',
    description: 'Providing care and support for elderly citizens who have been abandoned or cannot afford proper care.',
    organizer: 'Senior Care Foundation',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800',
    donorCount: 0,
  },
  {
    title: 'Youth Sports Development',
    description: 'Establishing sports facilities and training programs for underprivileged youth to promote physical fitness and teamwork.',
    organizer: 'Sports for All Trust',
    goalAmount: 450000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800',
    donorCount: 0,
  },
  {
    title: 'Mobile Health Clinic',
    description: 'Setting up a mobile health clinic to provide free medical checkups and basic treatment in remote areas.',
    organizer: 'Rural Health Initiative',
    goalAmount: 550000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800',
    donorCount: 0,
  },
  {
    title: 'Women Entrepreneurship Program',
    description: 'Training and supporting women to start their own businesses and become financially independent.',
    organizer: 'Women Empowerment Network',
    goalAmount: 700000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    donorCount: 0,
  },
  {
    title: 'Disability Support Services',
    description: 'Providing assistive devices, therapy, and support services for people with disabilities.',
    organizer: 'Inclusive Support Foundation',
    goalAmount: 500000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800',
    donorCount: 0,
  },
  {
    title: 'Food Bank Expansion',
    description: 'Expanding our food bank to serve more families in need and reduce hunger in our community.',
    organizer: 'Food Security Trust',
    goalAmount: 400000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
    donorCount: 0,
  },
  {
    title: 'Rural Internet Connectivity',
    description: 'Installing internet infrastructure in remote villages to bridge the digital divide and enable online education.',
    organizer: 'Digital Bridge Initiative',
    goalAmount: 650000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    donorCount: 0,
  },
  {
    title: 'Child Protection Program',
    description: 'Establishing safe spaces and support services for vulnerable children and victims of abuse.',
    organizer: 'Child Safety Foundation',
    goalAmount: 580000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
    donorCount: 0,
  },
  {
    title: 'Renewable Energy for Schools',
    description: 'Installing solar panels in schools to provide clean energy and reduce electricity costs.',
    organizer: 'Green Schools Initiative',
    goalAmount: 750000,
    raisedAmount: 0,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
    donorCount: 0,
  },
  {
    title: 'Art Therapy for Trauma Victims',
    description: 'Providing art therapy sessions to help trauma victims heal and express themselves creatively.',
    organizer: 'Healing Arts Foundation',
    goalAmount: 420000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
    donorCount: 0,
  },
  {
    title: 'Tech Training for Seniors',
    description: 'Teaching senior citizens how to use smartphones, computers, and the internet to stay connected.',
    organizer: 'Tech for Seniors',
    goalAmount: 350000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
    donorCount: 0,
  },
  {
    title: 'Housing for Homeless Families',
    description: 'Building affordable housing units for homeless families and providing them with basic amenities.',
    organizer: 'Housing for All Trust',
    goalAmount: 1200000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    donorCount: 0,
  },
  {
    title: 'Preservation of Historical Sites',
    description: 'Restoring and preserving historical monuments and sites for future generations.',
    organizer: 'Heritage Conservation Society',
    goalAmount: 900000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
    donorCount: 0,
  },
  {
    title: 'Music Education for Children',
    description: 'Providing music lessons and instruments to children from low-income families.',
    organizer: 'Music for All Foundation',
    goalAmount: 480000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    donorCount: 0,
  },
  {
    title: 'Emergency Ambulance Service',
    description: 'Setting up a free ambulance service for emergency medical situations in rural areas.',
    organizer: 'Emergency Medical Services',
    goalAmount: 850000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800',
    donorCount: 0,
  },
  {
    title: 'Organic Farming Training',
    description: 'Training farmers in organic farming techniques to promote sustainable agriculture.',
    organizer: 'Sustainable Agriculture Trust',
    goalAmount: 520000,
    raisedAmount: 0,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
    donorCount: 0,
  },
  {
    title: 'Legal Aid for Underprivileged',
    description: 'Providing free legal assistance to people who cannot afford legal representation.',
    organizer: 'Legal Aid Society',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
    donorCount: 0,
  },
  {
    title: 'Rehabilitation Center for Addicts',
    description: 'Establishing a rehabilitation center to help people overcome addiction and rebuild their lives.',
    organizer: 'Recovery Support Foundation',
    goalAmount: 950000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800',
    donorCount: 0,
  },
];

const rejectedCampaigns = [
  {
    title: 'Cryptocurrency Investment Fund',
    description: 'Raising funds to invest in cryptocurrency and share profits with donors.',
    organizer: 'Crypto Investment Group',
    goalAmount: 2000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    donorCount: 0,
    rejectionReason: 'Campaign violates platform guidelines. Investment schemes are not allowed.',
  },
  {
    title: 'Personal Luxury Purchase',
    description: 'I need money to buy a luxury car for personal use. Please help me achieve my dream.',
    organizer: 'Personal Request',
    goalAmount: 1500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
    donorCount: 0,
    rejectionReason: 'Personal luxury purchases do not align with our platform\'s mission of helping those in need.',
  },
  {
    title: 'Gambling Business Startup',
    description: 'Starting an online gambling platform. Investors will receive a share of profits.',
    organizer: 'Gaming Ventures',
    goalAmount: 5000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800',
    donorCount: 0,
    rejectionReason: 'Gambling-related campaigns are prohibited on our platform.',
  },
  {
    title: 'Political Campaign Funding',
    description: 'Raising funds for political campaign expenses and election activities.',
    organizer: 'Political Party',
    goalAmount: 3000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1529107386315-e3a3b5d5e0a4?w=800',
    donorCount: 0,
    rejectionReason: 'Political campaigns are not allowed on this platform.',
  },
  {
    title: 'Unverified Medical Treatment',
    description: 'Alternative medicine treatment that has not been approved by medical authorities.',
    organizer: 'Alternative Health',
    goalAmount: 800000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800',
    donorCount: 0,
    rejectionReason: 'Unverified medical treatments cannot be promoted. Please provide proper medical documentation.',
  },
  {
    title: 'Incomplete Campaign Information',
    description: 'Help me raise money.',
    organizer: 'Unknown',
    goalAmount: 100000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    donorCount: 0,
    rejectionReason: 'Campaign description is too vague and lacks necessary details. Please provide more information about the cause and how funds will be used.',
  },
  {
    title: 'Suspicious Fundraising Activity',
    description: 'Need urgent funds for emergency situation. Will provide details later.',
    organizer: 'Urgent Help',
    goalAmount: 500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    donorCount: 0,
    rejectionReason: 'Campaign lacks transparency and proper documentation. Please provide detailed information about the cause.',
  },
  {
    title: 'Commercial Business Investment',
    description: 'Seeking investors for a commercial business venture. Returns guaranteed.',
    organizer: 'Business Ventures',
    goalAmount: 4000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    donorCount: 0,
    rejectionReason: 'Commercial investment opportunities are not allowed. This platform is for charitable causes only.',
  },
  {
    title: 'Inappropriate Content Campaign',
    description: 'Fundraising for content that may violate community guidelines.',
    organizer: 'Content Creator',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
    donorCount: 0,
    rejectionReason: 'Campaign content does not meet our community standards.',
  },
  {
    title: 'Duplicate Campaign',
    description: 'This is a duplicate of an existing campaign that was already approved.',
    organizer: 'Duplicate Organizer',
    goalAmount: 700000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800',
    donorCount: 0,
    rejectionReason: 'This campaign is a duplicate of an existing approved campaign.',
  },
  {
    title: 'Fake Organization',
    description: 'Raising funds for a non-existent organization without proper registration.',
    organizer: 'Fake Foundation',
    goalAmount: 900000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    donorCount: 0,
    rejectionReason: 'Organization verification failed. Please provide proper registration documents.',
  },
  {
    title: 'Misleading Campaign Title',
    description: 'The campaign title does not accurately reflect the actual purpose of the fundraising.',
    organizer: 'Misleading Campaign',
    goalAmount: 550000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    donorCount: 0,
    rejectionReason: 'Campaign title and description are misleading. Please provide accurate information.',
  },
];

const seedPendingRejectedCampaigns = async (): Promise<void> => {
  try {
    // Get or create a test organizer user
    let organizer = await User.findOne({ email: 'organizer@test.com' });
    if (!organizer) {
      organizer = await User.create({
        name: 'Test Organizer',
        email: 'organizer@test.com',
        password: 'password123',
        role: 'user',
      });
      logger.info('Created test organizer user');
    }

    // Ensure categories exist
    const categoryNames = ['Medical', 'Education', 'Disaster Relief', 'Animal Welfare', 'Environment', 'Other'];
    for (const catName of categoryNames) {
      const existing = await Category.findOne({ name: catName });
      if (!existing) {
        await Category.create({
          name: catName,
          description: `${catName} campaigns`,
          isActive: true,
        });
        logger.info(`Created category: ${catName}`);
      }
    }

    // Get all categories
    const categories = await Category.find({});
    if (categories.length === 0) {
      logger.error('No categories found after creation attempt.');
      return;
    }

    // Create a category map
    const categoryMap = new Map();
    categories.forEach((cat) => {
      categoryMap.set(cat.name, cat._id);
    });

    // Seed Pending Campaigns
    let pendingCreated = 0;
    let pendingSkipped = 0;

    for (const campaignData of pendingCampaigns) {
      const existing = await Campaign.findOne({
        title: campaignData.title,
        organizerId: organizer._id,
        status: 'pending',
      });

      if (existing) {
        pendingSkipped++;
        continue;
      }

      const categoryId = categoryMap.get(campaignData.categoryName);
      if (!categoryId) {
        logger.warn(`Category "${campaignData.categoryName}" not found, skipping campaign: ${campaignData.title}`);
        continue;
      }

      const daysFromNow = Math.floor(Math.random() * 60) + 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysFromNow);

      await Campaign.create({
        ...campaignData,
        organizerId: organizer._id,
        category: categoryId,
        status: 'pending',
        endDate,
        views: 0,
        shares: 0,
        galleryImages: [],
        socialMedia: {},
      });

      pendingCreated++;
    }

    // Seed Rejected Campaigns
    let rejectedCreated = 0;
    let rejectedSkipped = 0;

    // Get admin user for approvedBy field
    const adminUser = await User.findOne({ role: 'admin' });

    for (const campaignData of rejectedCampaigns) {
      const existing = await Campaign.findOne({
        title: campaignData.title,
        organizerId: organizer._id,
        status: 'rejected',
      });

      if (existing) {
        rejectedSkipped++;
        continue;
      }

      const categoryId = categoryMap.get(campaignData.categoryName);
      if (!categoryId) {
        logger.warn(`Category "${campaignData.categoryName}" not found, skipping campaign: ${campaignData.title}`);
        continue;
      }

      const daysFromNow = Math.floor(Math.random() * 60) + 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysFromNow);

      await Campaign.create({
        ...campaignData,
        organizerId: organizer._id,
        category: categoryId,
        status: 'rejected',
        rejectionReason: campaignData.rejectionReason,
        endDate,
        views: 0,
        shares: 0,
        galleryImages: [],
        socialMedia: {},
        approvedBy: adminUser?._id || organizer._id,
        approvedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date in last 30 days
      });

      rejectedCreated++;
    }

    logger.info(`✅ Campaign seeding completed:`);
    logger.info(`   📋 Pending: ${pendingCreated} created, ${pendingSkipped} skipped`);
    logger.info(`   ❌ Rejected: ${rejectedCreated} created, ${rejectedSkipped} skipped`);
    logger.info(`📊 Total pending campaigns: ${await Campaign.countDocuments({ status: 'pending' })}`);
    logger.info(`📊 Total rejected campaigns: ${await Campaign.countDocuments({ status: 'rejected' })}`);
  } catch (error: any) {
    logger.error('Error seeding campaigns:', error);
    throw error;
  }
};

const runSeed = async (): Promise<void> => {
  try {
    await connectDB();
    await seedPendingRejectedCampaigns();
    logger.info('✅ Seed pending/rejected campaigns completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Seed campaigns error:', error);
    process.exit(1);
  }
};

runSeed();

