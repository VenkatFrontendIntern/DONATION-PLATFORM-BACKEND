/**
 * Script to fix the razorpayPaymentId sparse unique index
 * 
 * This script drops and recreates the index to ensure it properly handles null/undefined values
 * 
 * Run with: tsx scripts/fix-razorpay-payment-id-index.ts
 */

import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';

async function fixIndex() {
  try {
    // Connect to MongoDB using the same connection method as the app
    await connectDB();
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collection = db.collection('donations');

    // Check if index exists
    const indexes = await collection.indexes();
    const existingIndex = indexes.find(
      (idx: any) => 
        idx.name === 'razorpayPaymentId_1' || 
        (idx.key && idx.key.razorpayPaymentId)
    );

    if (existingIndex) {
      console.log('Found existing index:', existingIndex);
      
      // Drop the existing index
      try {
        await collection.dropIndex('razorpayPaymentId_1');
        console.log('Dropped existing razorpayPaymentId_1 index');
      } catch (dropError: any) {
        // Try dropping by key if name doesn't work
        try {
          // Use type assertion to handle MongoDB's flexible dropIndex signature
          await collection.dropIndex({ razorpayPaymentId: 1 } as any);
          console.log('Dropped existing index by key');
        } catch (dropError2: any) {
          console.log('Could not drop index (might not exist or different name):', dropError2.message);
        }
      }
    }

    // Update all documents: remove razorpayPaymentId field if it's null
    const updateResult = await collection.updateMany(
      { razorpayPaymentId: null },
      { $unset: { razorpayPaymentId: "" } }
    );
    console.log(`Updated ${updateResult.modifiedCount} documents: removed null razorpayPaymentId values`);

    // Create the sparse unique index
    await collection.createIndex(
      { razorpayPaymentId: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'razorpayPaymentId_1'
      }
    );
    console.log('Created new sparse unique index on razorpayPaymentId');

    // Verify the index
    const newIndexes = await collection.indexes();
    const newIndex = newIndexes.find(
      (idx: any) => 
        idx.name === 'razorpayPaymentId_1' || 
        (idx.key && idx.key.razorpayPaymentId)
    );
    console.log('New index created:', newIndex);

    console.log('\n✅ Index fix completed successfully!');
    console.log('\nThe index is now properly configured as sparse, which means:');
    console.log('- Multiple documents can have null/undefined razorpayPaymentId');
    console.log('- Only non-null values must be unique');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('Error fixing index:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the fix
fixIndex();

