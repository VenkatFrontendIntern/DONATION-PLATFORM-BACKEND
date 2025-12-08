import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { Campaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../utils/logger.js';

const mockCampaigns = [
  {
    title: 'Emergency Medical Fund for Warangal Families',
    description: 'Providing critical medical care and emergency treatment for underprivileged families in Warangal district. Your contribution helps save lives and provides access to quality healthcare for those who cannot afford it. We support families with serious medical conditions, emergency surgeries, and ongoing treatment needs.',
    organizer: 'Warangal Medical Relief Society',
    goalAmount: 500000,
    raisedAmount: 187500,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80',
    donorCount: 68,
  },
  {
    title: 'Education Support for Warangal Rural Children',
    description: 'Supporting education for 150 children from rural areas around Warangal. Your donation provides school uniforms, books, stationery, and annual school fees. We focus on children from farming families and daily wage workers who struggle to afford quality education for their children.',
    organizer: 'Telangana Education Trust',
    goalAmount: 400000,
    raisedAmount: 245000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    donorCount: 94,
  },
  {
    title: 'Monsoon Flood Relief - Warangal District',
    description: 'Recent heavy monsoon rains have caused severe flooding in several villages of Warangal district. Many families have lost their homes, crops, and belongings. We need urgent help to provide food supplies, temporary shelter, clothing, and support rebuilding efforts for affected families.',
    organizer: 'Warangal Disaster Relief Committee',
    goalAmount: 800000,
    raisedAmount: 425000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80',
    donorCount: 142,
  },
  {
    title: 'Street Animal Care - Warangal City',
    description: 'Caring for stray dogs and cats in Warangal city. Our initiative includes vaccination drives, sterilization programs, medical treatment for injured animals, and finding loving homes for abandoned pets. Help us make Warangal a safer and more compassionate city for all living beings.',
    organizer: 'Warangal Animal Welfare Society',
    goalAmount: 300000,
    raisedAmount: 128000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
    donorCount: 51,
  },
  {
    title: 'Green Warangal - Tree Plantation Drive',
    description: 'Planting 15,000 native trees across Warangal city and surrounding areas to combat pollution and increase green cover. Each tree costs ₹60 including sapling, protection, and maintenance for the first year. Join us in making Warangal greener and healthier for future generations.',
    organizer: 'Warangal Green Initiative',
    goalAmount: 900000,
    raisedAmount: 567000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    donorCount: 203,
  },
  {
    title: 'Cancer Treatment Fund - Telangana Patients',
    description: 'Supporting cancer patients from Warangal and nearby districts who cannot afford expensive treatment. We help cover chemotherapy, radiation therapy, surgery costs, and medication. Your donation brings hope to families fighting this difficult battle and provides access to life-saving treatment.',
    organizer: 'Telangana Cancer Care Foundation',
    goalAmount: 1200000,
    raisedAmount: 485000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800&q=80',
    donorCount: 127,
  },
  {
    title: 'Girl Child Education Scholarship - Warangal',
    description: 'Empowering girls from marginalized communities in Warangal through education scholarships. We provide financial support for higher education, including college fees, hostel accommodation, and study materials. Our goal is to help talented girls achieve their dreams despite financial constraints.',
    organizer: 'Warangal Women Empowerment Trust',
    goalAmount: 600000,
    raisedAmount: 342000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    donorCount: 89,
  },
  {
    title: 'Cyclone Michaung Relief - Telangana',
    description: 'Cyclone Michaung caused significant damage to homes and infrastructure in several districts of Telangana including Warangal. We are providing immediate relief including food packets, clean water, temporary shelter materials, and supporting long-term rebuilding of damaged houses.',
    organizer: 'Telangana Disaster Response Team',
    goalAmount: 1000000,
    raisedAmount: 612000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 198,
  },
  {
    title: 'Rabies Prevention - Stray Dog Vaccination',
    description: 'Mass vaccination and sterilization drive for stray dogs across Warangal city to prevent rabies and control the stray population humanely. We work with local veterinarians and animal welfare organizations to ensure every street dog is vaccinated and cared for properly.',
    organizer: 'Warangal Animal Care Foundation',
    goalAmount: 250000,
    raisedAmount: 142000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    donorCount: 67,
  },
  {
    title: 'Clean Drinking Water for Warangal Villages',
    description: 'Installing RO water purification systems in 25 villages around Warangal where access to clean drinking water is limited. Each system costs ₹15,000 and serves approximately 50 families. Help us provide safe, clean water to prevent waterborne diseases.',
    organizer: 'Warangal Water Mission',
    goalAmount: 375000,
    raisedAmount: 228000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 112,
  },
  {
    title: 'Pediatric Heart Surgery - Warangal Child',
    description: '8-year-old Ravi from Warangal needs urgent open-heart surgery costing ₹3.5 lakhs. His parents are daily wage workers and cannot afford this life-saving procedure. Your donation will give Ravi a chance at a healthy, normal life. Every contribution matters.',
    organizer: 'Warangal Children Health Foundation',
    goalAmount: 350000,
    raisedAmount: 287000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80',
    donorCount: 156,
  },
  {
    title: 'Digital Education for Warangal Government Schools',
    description: 'Providing tablets, projectors, and internet connectivity to 30 government schools in Warangal district. This initiative helps bridge the digital divide and gives rural children access to online learning resources, educational videos, and interactive content.',
    organizer: 'Telangana Digital Education Society',
    goalAmount: 750000,
    raisedAmount: 412000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    donorCount: 134,
  },
  {
    title: 'Drought Relief - Water Tankers for Farmers',
    description: 'Severe drought conditions in Warangal district have left many farmers without water for irrigation and drinking. We are providing water tankers, digging borewells, and supporting farmers with alternative livelihood options during this crisis.',
    organizer: 'Warangal Farmers Welfare Association',
    goalAmount: 650000,
    raisedAmount: 389000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 98,
  },
  {
    title: 'Wildlife Rescue and Rehabilitation - Telangana',
    description: 'Rescuing and rehabilitating injured wildlife found in and around Warangal district, including birds, reptiles, and small mammals. We provide medical treatment, temporary shelter, and release them back into their natural habitat when ready.',
    organizer: 'Telangana Wildlife Rescue Center',
    goalAmount: 450000,
    raisedAmount: 256000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    donorCount: 87,
  },
  {
    title: 'Solar Street Lights for Warangal Villages',
    description: 'Installing solar-powered street lights in 40 villages around Warangal that lack proper lighting. This improves safety, especially for women and children, and enables evening activities. Each solar light costs ₹8,000 including installation and maintenance.',
    organizer: 'Warangal Solar Energy Project',
    goalAmount: 320000,
    raisedAmount: 198000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
    donorCount: 76,
  },
  {
    title: 'Kidney Transplant Support - Warangal Patient',
    description: 'Supporting 45-year-old Suresh from Warangal who needs a kidney transplant. The total cost including surgery, medication, and follow-up care is ₹8 lakhs. His family has exhausted all savings. Your help can save his life and support his family.',
    organizer: 'Warangal Organ Donation Society',
    goalAmount: 800000,
    raisedAmount: 523000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80',
    donorCount: 201,
  },
  {
    title: 'Skill Development Center - Warangal Youth',
    description: 'Training unemployed youth from Warangal in practical skills like electrician work, plumbing, tailoring, and mobile phone repair. Our 3-month courses include practical training, certification, and job placement assistance. Help create employment opportunities for local youth.',
    organizer: 'Warangal Skills Development Trust',
    goalAmount: 550000,
    raisedAmount: 312000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    donorCount: 103,
  },
  {
    title: 'Borewell Installation - Warangal Drought Areas',
    description: 'Installing deep borewells in 20 drought-affected villages around Warangal to provide sustainable water sources for drinking and irrigation. Each borewell costs ₹50,000 including drilling, pump installation, and water testing. Help farmers and villagers access reliable water supply.',
    organizer: 'Warangal Water Resources Foundation',
    goalAmount: 1000000,
    raisedAmount: 645000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 167,
  },
  {
    title: 'Pet Adoption Drive - Warangal Animal Shelter',
    description: 'Supporting our animal shelter in Warangal that rescues abandoned pets and finds them loving homes. Funds cover food, medical care, vaccination, sterilization, and shelter maintenance. Help us give these animals a second chance at a happy life.',
    organizer: 'Warangal Pet Care Society',
    goalAmount: 280000,
    raisedAmount: 156000,
    categoryName: 'Animal Welfare',
    coverImage: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    donorCount: 58,
  },
  {
    title: 'Waste Segregation and Recycling - Warangal City',
    description: 'Implementing proper waste segregation, recycling, and composting systems in Warangal city. This includes setting up collection centers, training waste workers, and creating awareness about waste management. Help us make Warangal cleaner and more sustainable.',
    organizer: 'Warangal Clean City Initiative',
    goalAmount: 600000,
    raisedAmount: 378000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    donorCount: 145,
  },
  {
    title: 'Mental Health Counseling Center - Warangal',
    description: 'Establishing a free mental health counseling center in Warangal with trained counselors and psychologists. We provide therapy sessions, support groups, and awareness programs to break the stigma around mental health. Help us make mental healthcare accessible to all.',
    organizer: 'Warangal Mental Health Foundation',
    goalAmount: 500000,
    raisedAmount: 267000,
    categoryName: 'Medical',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d0c6e?w=800&q=80',
    donorCount: 92,
  },
  {
    title: 'Mobile Library for Warangal Rural Children',
    description: 'Setting up a mobile library van that visits 50 villages around Warangal weekly, providing books, educational materials, and reading sessions for children. This initiative promotes reading habits and provides access to knowledge for children who cannot visit city libraries.',
    organizer: 'Warangal Reading Foundation',
    goalAmount: 400000,
    raisedAmount: 234000,
    categoryName: 'Education',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    donorCount: 78,
  },
  {
    title: 'Fire Accident Relief - Warangal Market Area',
    description: 'A devastating fire in Warangal\'s main market area destroyed 25 shops and left many families without income. We are providing immediate relief including food, clothing, temporary shelter, and supporting shop owners to rebuild their businesses.',
    organizer: 'Warangal Traders Welfare Association',
    goalAmount: 850000,
    raisedAmount: 512000,
    categoryName: 'Disaster Relief',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    donorCount: 189,
  },
  {
    title: 'Lake Conservation - Warangal Water Bodies',
    description: 'Cleaning and conserving lakes and water bodies in and around Warangal city. This includes removing waste, preventing pollution, planting trees around lakes, and creating awareness about water conservation. Help preserve our precious water resources.',
    organizer: 'Warangal Lake Conservation Society',
    goalAmount: 700000,
    raisedAmount: 456000,
    categoryName: 'Environment',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    donorCount: 167,
  },
];

const seedCampaigns = async (): Promise<void> => {
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

