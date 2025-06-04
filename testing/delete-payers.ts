// Script to delete all payers from a specific function
import { MongoClient } from 'mongodb';

// Connection URI with credentials
const uri = 'mongodb://admin:password@localhost:27017/moi_software_db?authSource=admin';
const dbName = 'moi_software_db';

// The specific function_id we're deleting payers from
const FUNCTION_ID = 'திருமண_விழா-முருகன்_சுப்பிரமணியம்-சென்னை-2025-06-15-10:00_am';

async function deleteAllPayersFromFunction() {
  let client: MongoClient | null = null;
  
  try {
    // Create a new MongoClient
    client = new MongoClient(uri);
    
    // Connect to the client
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get the database
    const db = client.db(dbName);
    
    // Define collection
    const payersCollection = db.collection('payers');
    
    // First, let's count how many payers exist for this function
    const existingCount = await payersCollection.countDocuments({
      function_id: FUNCTION_ID
    });
    
    console.log(`\n--- Found ${existingCount} payers for function: ${FUNCTION_ID} ---`);
    
    if (existingCount === 0) {
      console.log('No payers found to delete.');
      return;
    }
    
    // Get some sample data before deletion for confirmation
    const samplePayers = await payersCollection.find({
      function_id: FUNCTION_ID
    }).limit(5).toArray();
    
    console.log('\nSample of payers to be deleted:');
    samplePayers.forEach((payer, index) => {
      console.log(`${index + 1}. ${payer.payer_name} - ₹${payer.payer_amount || 0} - ${payer.payer_given_object}`);
    });
    
    // Ask for confirmation (you can remove this in production)
    console.log('\n⚠️  WARNING: This will permanently delete all payers for this function!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    // Wait 5 seconds for user to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Perform the deletion
    console.log('\nProceeding with deletion...');
    
    const deleteResult = await payersCollection.deleteMany({
      function_id: FUNCTION_ID
    });
    
    console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} payers from the function.`);
    
    // Verify deletion
    const remainingCount = await payersCollection.countDocuments({
      function_id: FUNCTION_ID
    });
    
    console.log(`Verification: ${remainingCount} payers remaining for this function.`);
    
    // Optional: Also check if there are any soft-deleted entries
    const softDeletedCount = await payersCollection.countDocuments({
      function_id: FUNCTION_ID,
      is_deleted: true
    });
    
    if (softDeletedCount > 0) {
      console.log(`\nNote: Found ${softDeletedCount} soft-deleted payers. These were not affected by this operation.`);
    }
    
  } catch (error) {
    console.error('Error deleting payers:', error);
  } finally {
    // Close the connection
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Alternative: Soft delete function (sets is_deleted = true instead of removing)
async function softDeleteAllPayersFromFunction() {
  let client: MongoClient | null = null;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    const db = client.db(dbName);
    const payersCollection = db.collection('payers');
    
    // Count active payers
    const activeCount = await payersCollection.countDocuments({
      function_id: FUNCTION_ID,
      is_deleted: false
    });
    
    console.log(`\n--- Found ${activeCount} active payers for function: ${FUNCTION_ID} ---`);
    
    if (activeCount === 0) {
      console.log('No active payers found to soft delete.');
      return;
    }
    
    // Perform soft delete
    const updateResult = await payersCollection.updateMany(
      {
        function_id: FUNCTION_ID,
        is_deleted: false
      },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`\n✅ Successfully soft-deleted ${updateResult.modifiedCount} payers.`);
    
  } catch (error) {
    console.error('Error soft-deleting payers:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the script based on command line argument
const args = process.argv.slice(2);
const deleteType = args[0] || 'hard'; // default to hard delete

if (deleteType === 'soft') {
  console.log('Running SOFT DELETE (marking as deleted)...');
  softDeleteAllPayersFromFunction();
} else {
  console.log('Running HARD DELETE (permanent removal)...');
  deleteAllPayersFromFunction();
}

// Usage instructions
console.log('\n📝 Usage:');
console.log('  For permanent deletion: ts-node delete-payers.ts');
console.log('  For soft deletion: ts-node delete-payers.ts soft');