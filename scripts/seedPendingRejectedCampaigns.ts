import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Campaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../utils/logger.js';

const pendingCampaigns = [
  {
    title: 'Community Center for Warangal Slum Areas',
    description: 'Building a community center in Warangal\'s slum areas to serve as a hub for education, skill development, health checkups, and social activities. The center will provide a safe space for children, youth, and women from marginalized communities.',
    organizer: 'Warangal Community Development Society',
    goalAmount: 750000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Old Age Home - Warangal Senior Citizens',
    description: 'Establishing a care home for elderly citizens in Warangal who have been abandoned or cannot afford proper care. We will provide food, shelter, medical care, and emotional support to senior citizens in need.',
    organizer: 'Warangal Senior Care Foundation',
    goalAmount: 650000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Cricket Academy for Warangal Youth',
    description: 'Setting up a cricket training academy for underprivileged youth in Warangal. We will provide coaching, equipment, and facilities to help talented young cricketers develop their skills and pursue their passion for the sport.',
    organizer: 'Warangal Sports Development Trust',
    goalAmount: 500000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Mobile Health Van - Warangal Rural Areas',
    description: 'Operating a mobile health van that visits remote villages around Warangal weekly to provide free health checkups, basic treatment, and health awareness programs. This brings healthcare to doorsteps of those who cannot travel to city hospitals.',
    organizer: 'Warangal Rural Health Mission',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Women Self-Help Groups - Warangal',
    description: 'Forming and supporting women self-help groups in Warangal to start small businesses like tailoring, pickle making, and handicrafts. We provide training, initial capital, and market linkage support to help women become financially independent.',
    organizer: 'Warangal Women Entrepreneurs Network',
    goalAmount: 550000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Disability Support Center - Warangal',
    description: 'Providing assistive devices like wheelchairs, hearing aids, and prosthetics to people with disabilities in Warangal. We also offer physiotherapy, occupational therapy, and vocational training to help them lead independent lives.',
    organizer: 'Warangal Disability Support Foundation',
    goalAmount: 700000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Midday Meal Program - Warangal Schools',
    description: 'Expanding midday meal program to 50 government schools in Warangal district. We provide nutritious meals to children from poor families, ensuring they get at least one proper meal a day and encouraging school attendance.',
    organizer: 'Warangal Food Security Trust',
    goalAmount: 450000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Internet Connectivity for Warangal Villages',
    description: 'Installing WiFi hotspots and providing internet connectivity in 30 villages around Warangal. This enables online education, telemedicine, and digital services for rural communities, bridging the digital divide.',
    organizer: 'Warangal Digital Connectivity Initiative',
    goalAmount: 800000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Child Protection and Safety - Warangal',
    description: 'Establishing a child protection center in Warangal with safe spaces, counseling services, and support for vulnerable children and victims of abuse. We work with local authorities to ensure children\'s safety and rehabilitation.',
    organizer: 'Warangal Child Safety Foundation',
    goalAmount: 650000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Solar Power for Warangal Government Schools',
    description: 'Installing solar panels in 40 government schools across Warangal district to provide clean energy, reduce electricity costs, and ensure uninterrupted power supply for digital classrooms and computer labs.',
    organizer: 'Warangal Green Schools Initiative',
    goalAmount: 900000,
    raisedAmount: 0,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Art and Music Therapy - Warangal',
    description: 'Providing art and music therapy sessions to children and adults dealing with trauma, stress, and mental health issues in Warangal. Creative expression helps in healing and emotional well-being.',
    organizer: 'Warangal Healing Arts Foundation',
    goalAmount: 400000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Digital Literacy for Warangal Seniors',
    description: 'Teaching senior citizens in Warangal how to use smartphones, computers, and internet services. This helps them stay connected with family, access online services, and use digital payment methods safely.',
    organizer: 'Warangal Tech for Seniors',
    goalAmount: 350000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Affordable Housing - Warangal Slum Dwellers',
    description: 'Building affordable housing units for slum dwellers and homeless families in Warangal. We provide basic amenities like water, electricity, and sanitation facilities to improve living conditions.',
    organizer: 'Warangal Housing for All Trust',
    goalAmount: 1500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Heritage Conservation - Warangal Fort Area',
    description: 'Restoring and preserving historical monuments in Warangal, including the famous Warangal Fort and Thousand Pillar Temple. This preserves our cultural heritage and promotes tourism in the region.',
    organizer: 'Warangal Heritage Conservation Society',
    goalAmount: 1200000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Music and Dance Classes - Warangal Children',
    description: 'Providing free music and dance classes to children from low-income families in Warangal. We teach classical and folk music, traditional dances, and provide instruments to talented children.',
    organizer: 'Warangal Cultural Education Foundation',
    goalAmount: 420000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Free Ambulance Service - Warangal',
    description: 'Operating a free ambulance service for emergency medical situations in Warangal city and surrounding areas. We provide 24/7 service for critical patients who cannot afford private ambulance charges.',
    organizer: 'Warangal Emergency Medical Services',
    goalAmount: 950000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Organic Farming Training - Warangal Farmers',
    description: 'Training farmers in Warangal district in organic farming techniques, natural pest control, and sustainable agriculture practices. This helps reduce chemical usage and improve soil health.',
    organizer: 'Warangal Sustainable Agriculture Trust',
    goalAmount: 580000,
    raisedAmount: 0,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'Free Legal Aid - Warangal Underprivileged',
    description: 'Providing free legal assistance and representation to people in Warangal who cannot afford lawyers. We help with property disputes, domestic violence cases, and other legal matters affecting the poor.',
    organizer: 'Warangal Legal Aid Society',
    goalAmount: 500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
    donorCount: 0,
  },
  {
    title: 'De-Addiction Center - Warangal',
    description: 'Establishing a rehabilitation center in Warangal to help people overcome alcohol and drug addiction. We provide counseling, medical treatment, and support to help them rebuild their lives and reintegrate into society.',
    organizer: 'Warangal Recovery Support Foundation',
    goalAmount: 1100000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800&q=80',
    donorCount: 0,
  },
];

const rejectedCampaigns = [
  {
    title: 'Bitcoin Investment Scheme - Warangal',
    description: 'Raising funds to invest in Bitcoin and cryptocurrency. Donors will receive 20% monthly returns on their investment. This is a guaranteed profit opportunity.',
    organizer: 'Warangal Crypto Investment Group',
    goalAmount: 2500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Campaign violates platform guidelines. Investment schemes and profit-sharing arrangements are not allowed on this charitable platform.',
  },
  {
    title: 'Personal Car Purchase - Warangal',
    description: 'I am a software engineer from Warangal and I need ₹15 lakhs to buy a luxury SUV for my personal use. Please help me achieve my dream car. I will be very grateful.',
    organizer: 'Personal Request - Warangal',
    goalAmount: 1500000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Personal luxury purchases do not align with our platform\'s mission of helping those in need. This platform is for charitable causes only.',
  },
  {
    title: 'Online Gaming Business - Warangal',
    description: 'Starting an online gaming and betting platform in Warangal. Investors will receive 30% share of profits. This is a high-return business opportunity.',
    organizer: 'Warangal Gaming Ventures',
    goalAmount: 5000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Gambling and betting-related campaigns are strictly prohibited on our platform as per Indian laws and platform guidelines.',
  },
  {
    title: 'Election Campaign Funding - Warangal MLA',
    description: 'Raising funds for election campaign expenses for MLA candidate in Warangal constituency. Funds will be used for rallies, advertisements, and campaign materials.',
    organizer: 'Warangal Political Party',
    goalAmount: 5000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1529107386315-e3a3b5d5e0a4?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Political campaigns and election funding are not allowed on this platform. This platform is exclusively for charitable and social causes.',
  },
  {
    title: 'Unproven Ayurvedic Cancer Treatment',
    description: 'Alternative Ayurvedic treatment for cancer that has shown 90% success rate. This treatment is not approved by medical authorities but has helped many patients.',
    organizer: 'Warangal Alternative Medicine Center',
    goalAmount: 900000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Unverified and unapproved medical treatments cannot be promoted. Please provide proper medical documentation and approvals from recognized medical authorities.',
  },
  {
    title: 'Urgent Help Needed',
    description: 'Need money urgently. Please help.',
    organizer: 'Warangal Help',
    goalAmount: 200000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Campaign description is too vague and lacks necessary details. Please provide comprehensive information about the cause, beneficiaries, and how funds will be utilized.',
  },
  {
    title: 'Emergency Funds - Details Confidential',
    description: 'Need urgent funds for a personal emergency situation. Cannot disclose details due to privacy reasons. Will provide more information after receiving funds.',
    organizer: 'Warangal Urgent Help',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Campaign lacks transparency and proper documentation. All campaigns must provide detailed information about the cause, beneficiaries, and fund utilization for approval.',
  },
  {
    title: 'Restaurant Business Investment - Warangal',
    description: 'Seeking investors for a new restaurant chain in Warangal. Minimum investment ₹50,000 with guaranteed 25% annual returns. This is a profitable business opportunity.',
    organizer: 'Warangal Restaurant Ventures',
    goalAmount: 3000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Commercial business investments and profit-sharing schemes are not allowed. This platform is exclusively for charitable causes and social welfare activities.',
  },
  {
    title: 'Adult Content Production',
    description: 'Fundraising for adult content production and distribution. This will be a subscription-based service with premium content.',
    organizer: 'Warangal Media Production',
    goalAmount: 800000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Campaign content does not meet our community standards and platform guidelines. Inappropriate content is strictly prohibited.',
  },
  {
    title: 'Duplicate Medical Fund Campaign',
    description: 'This is a duplicate of the existing "Emergency Medical Fund for Warangal Families" campaign that was already approved and is currently active.',
    organizer: 'Warangal Medical Relief Society',
    goalAmount: 500000,
    raisedAmount: 0,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'This campaign is a duplicate of an existing approved campaign. Please create a unique campaign with different objectives or beneficiaries.',
  },
  {
    title: 'Fake NGO Registration',
    description: 'Raising funds for a non-existent organization called "Warangal Social Welfare Foundation" that does not have proper registration or documentation.',
    organizer: 'Warangal Social Welfare Foundation',
    goalAmount: 1000000,
    raisedAmount: 0,
    categoryName: 'Other',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Organization verification failed. Please provide proper registration documents, NGO certificates, and proof of organization existence from relevant authorities.',
  },
  {
    title: 'Education Fund (Actually for Personal Use)',
    description: 'Raising funds for education support, but the actual purpose is different from what is mentioned in the title.',
    organizer: 'Misleading Campaign Organizer',
    goalAmount: 600000,
    raisedAmount: 0,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    donorCount: 0,
    rejectionReason: 'Campaign title and description are misleading and do not accurately represent the actual purpose. All campaigns must provide accurate and transparent information.',
  },
];

const seedPendingRejectedCampaigns = async (): Promise<void> => {
  try {
    // Get or create a test organizer user
    let organizer = await User.findOne({ email: 'organizer@warangalcharity.org' });
    if (!organizer) {
      organizer = await User.create({
        name: 'Rajesh Kumar',
        email: 'organizer@warangalcharity.org',
        password: 'password123',
        role: 'user',
        phone: '9876543210',
        address: {
          street: 'Main Road, Hanamkonda',
          city: 'Warangal',
          state: 'Telangana',
          pincode: '506001',
        },
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

