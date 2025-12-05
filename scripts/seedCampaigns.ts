import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Campaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../utils/logger.js';

const mockCampaigns = [
  {
    title: 'Help Save Lives - Emergency Medical Fund',
    description: 'We are raising funds to provide emergency medical care for underprivileged families. Every contribution helps save a life and brings hope to those in need.',
    organizer: 'Medical Relief Foundation',
    goalAmount: 500000,
    raisedAmount: 125000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800',
    donorCount: 45,
  },
  {
    title: 'Education for Underprivileged Children',
    description: 'Supporting education for 100 children from low-income families. Your donation will provide books, uniforms, and school fees for a full academic year.',
    organizer: 'Education for All Trust',
    goalAmount: 300000,
    raisedAmount: 180000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    donorCount: 78,
  },
  {
    title: 'Flood Relief - Rebuild Lives',
    description: 'Recent floods have devastated communities. We need your help to provide food, shelter, and rebuild homes for affected families.',
    organizer: 'Disaster Relief Network',
    goalAmount: 1000000,
    raisedAmount: 450000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
    donorCount: 120,
  },
  {
    title: 'Animal Shelter - Rescue and Care',
    description: 'Our animal shelter needs funds to rescue, treat, and care for abandoned and injured animals. Help us give them a second chance at life.',
    organizer: 'Paws and Claws Rescue',
    goalAmount: 250000,
    raisedAmount: 95000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800',
    donorCount: 32,
  },
  {
    title: 'Plant Trees - Green Earth Initiative',
    description: 'Join us in planting 10,000 trees to combat climate change. Each tree costs ₹50 and will help create a greener, healthier planet.',
    organizer: 'Green Earth Foundation',
    goalAmount: 500000,
    raisedAmount: 320000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
    donorCount: 156,
  },
  {
    title: 'Cancer Treatment Support Fund',
    description: 'Supporting cancer patients who cannot afford treatment. Your donation can save lives and bring hope to families fighting this battle.',
    organizer: 'Hope Cancer Foundation',
    goalAmount: 750000,
    raisedAmount: 280000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800',
    donorCount: 89,
  },
  {
    title: 'Scholarship Program for Girls',
    description: 'Empowering young girls through education. We provide scholarships for higher education to deserving students from marginalized communities.',
    organizer: 'Women Empowerment Trust',
    goalAmount: 400000,
    raisedAmount: 210000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    donorCount: 67,
  },
  {
    title: 'Earthquake Relief Fund',
    description: 'Recent earthquake has left many families homeless. Help us provide immediate relief including food, water, and temporary shelter.',
    organizer: 'Emergency Response Team',
    goalAmount: 800000,
    raisedAmount: 390000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    donorCount: 134,
  },
  {
    title: 'Stray Dog Vaccination Drive',
    description: 'Vaccinating and sterilizing stray dogs to control population and prevent diseases. Help us make our streets safer for everyone.',
    organizer: 'Animal Care Society',
    goalAmount: 200000,
    raisedAmount: 85000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    donorCount: 41,
  },
  {
    title: 'Clean Water Initiative',
    description: 'Installing water purification systems in rural villages. Every ₹1000 provides clean drinking water for a family for a year.',
    organizer: 'Water for All Foundation',
    goalAmount: 600000,
    raisedAmount: 340000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    donorCount: 98,
  },
  {
    title: 'Heart Surgery Fund',
    description: 'A 12-year-old child needs urgent heart surgery. Help us raise funds to save this young life and give them a chance at a healthy future.',
    organizer: 'Children Health Foundation',
    goalAmount: 350000,
    raisedAmount: 175000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800',
    donorCount: 56,
  },
  {
    title: 'Digital Learning for Rural Schools',
    description: 'Providing tablets and internet connectivity to rural schools. Help bridge the digital divide and give children access to quality education.',
    organizer: 'Digital Education Trust',
    goalAmount: 450000,
    raisedAmount: 220000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    donorCount: 73,
  },
  {
    title: 'Cyclone Relief - Rebuild Homes',
    description: 'Cyclone has destroyed hundreds of homes. We need funds to rebuild houses and restore normalcy to affected families.',
    organizer: 'Rebuild Foundation',
    goalAmount: 1200000,
    raisedAmount: 560000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
    donorCount: 167,
  },
  {
    title: 'Wildlife Conservation Project',
    description: 'Protecting endangered species and their habitats. Your donation helps fund conservation efforts and wildlife protection programs.',
    organizer: 'Wildlife Conservation Society',
    goalAmount: 550000,
    raisedAmount: 290000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    donorCount: 112,
  },
  {
    title: 'Solar Power for Villages',
    description: 'Installing solar panels in remote villages without electricity. Help bring light and power to communities that need it most.',
    organizer: 'Solar Energy Initiative',
    goalAmount: 700000,
    raisedAmount: 380000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
    donorCount: 145,
  },
  {
    title: 'Organ Transplant Support',
    description: 'Helping patients who need organ transplants but cannot afford the surgery. Every life matters, help us save them.',
    organizer: 'Life Support Foundation',
    goalAmount: 900000,
    raisedAmount: 420000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800',
    donorCount: 178,
  },
  {
    title: 'Vocational Training Center',
    description: 'Training unemployed youth in skills like carpentry, plumbing, and electrical work. Help create employment opportunities.',
    organizer: 'Skills Development Trust',
    goalAmount: 380000,
    raisedAmount: 195000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
    donorCount: 64,
  },
  {
    title: 'Drought Relief - Water Wells',
    description: 'Digging water wells in drought-affected regions. Providing sustainable water sources for communities facing severe water scarcity.',
    organizer: 'Water Well Foundation',
    goalAmount: 650000,
    raisedAmount: 310000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    donorCount: 101,
  },
  {
    title: 'Pet Adoption and Care',
    description: 'Supporting our pet adoption center. Funds will help care for rescued pets and find them loving homes.',
    organizer: 'Happy Paws Adoption',
    goalAmount: 180000,
    raisedAmount: 72000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    donorCount: 28,
  },
  {
    title: 'Waste Management Program',
    description: 'Implementing proper waste management systems in urban areas. Help us create cleaner, healthier cities.',
    organizer: 'Clean City Initiative',
    goalAmount: 480000,
    raisedAmount: 240000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800',
    donorCount: 82,
  },
  {
    title: 'Mental Health Support Center',
    description: 'Establishing a mental health support center with counseling services. Breaking the stigma and providing accessible mental healthcare.',
    organizer: 'Mind Care Foundation',
    goalAmount: 420000,
    raisedAmount: 190000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800',
    donorCount: 59,
  },
  {
    title: 'Library for Rural Children',
    description: 'Building a library with books and learning resources for children in remote villages. Opening doors to knowledge and imagination.',
    organizer: 'Books for All Trust',
    goalAmount: 280000,
    raisedAmount: 140000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    donorCount: 46,
  },
  {
    title: 'Fire Relief Fund',
    description: 'A devastating fire has destroyed homes and livelihoods. Help us provide immediate relief and support rebuilding efforts.',
    organizer: 'Fire Relief Committee',
    goalAmount: 950000,
    raisedAmount: 470000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    donorCount: 189,
  },
  {
    title: 'Marine Life Protection',
    description: 'Protecting marine ecosystems and cleaning ocean pollution. Help preserve our oceans for future generations.',
    organizer: 'Ocean Guardians',
    goalAmount: 520000,
    raisedAmount: 270000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    donorCount: 93,
  },
];

const seedCampaigns = async (): Promise<void> => {
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

    // Ensure categories exist - create them if they don't
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

    // Clear existing test campaigns (optional - comment out if you want to keep existing)
    const existingCount = await Campaign.countDocuments({ organizerId: organizer._id });
    if (existingCount > 0) {
      logger.info(`Found ${existingCount} existing campaigns from test organizer`);
    }

    // Create campaigns
    let created = 0;
    let skipped = 0;

    for (const campaignData of mockCampaigns) {
      // Check if campaign already exists
      const existing = await Campaign.findOne({
        title: campaignData.title,
        organizerId: organizer._id,
      });

      if (existing) {
        skipped++;
        continue;
      }

      const categoryId = categoryMap.get(campaignData.categoryName);
      if (!categoryId) {
        logger.warn(`Category "${campaignData.categoryName}" not found, skipping campaign: ${campaignData.title}`);
        continue;
      }

      // Calculate end date (30-90 days from now)
      const daysFromNow = Math.floor(Math.random() * 60) + 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysFromNow);

      await Campaign.create({
        ...campaignData,
        organizerId: organizer._id,
        category: categoryId,
        status: 'approved',
        endDate,
        views: Math.floor(Math.random() * 1000) + 100,
        shares: Math.floor(Math.random() * 50) + 10,
        galleryImages: [],
        socialMedia: {},
      });

      created++;
    }

    logger.info(`✅ Campaign seeding completed: ${created} created, ${skipped} skipped`);
    logger.info(`📊 Total approved campaigns in database: ${await Campaign.countDocuments({ status: 'approved' })}`);
  } catch (error: any) {
    logger.error('Error seeding campaigns:', error);
    throw error;
  }
};

const runSeed = async (): Promise<void> => {
  try {
    await connectDB();
    await seedCampaigns();
    logger.info('✅ Seed campaigns completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Seed campaigns error:', error);
    process.exit(1);
  }
};

runSeed();

