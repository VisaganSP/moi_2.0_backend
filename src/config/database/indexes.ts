import Function from '../../models/Function.model';
import Payer from '../../models/Payer.model';

export const createFunctionIndexes = async () => {
  try {
    console.log('Creating Function indexes...');
    
    // Individual field indexes for search optimization
    await Function.collection.createIndex({ function_id: 1 });
    await Function.collection.createIndex({ function_name: 1 });
    await Function.collection.createIndex({ function_owner_name: 1 });
    await Function.collection.createIndex({ function_owner_city: 1 });
    await Function.collection.createIndex({ function_owner_address: 1 });
    await Function.collection.createIndex({ function_owner_phno: 1 });
    await Function.collection.createIndex({ function_amt_spent: 1 });
    await Function.collection.createIndex({ function_hero_name: 1 });
    await Function.collection.createIndex({ function_heroine_name: 1 });
    await Function.collection.createIndex({ function_held_place: 1 });
    await Function.collection.createIndex({ function_held_city: 1 });
    await Function.collection.createIndex({ function_start_date: 1 });
    await Function.collection.createIndex({ created_at: -1 });
    await Function.collection.createIndex({ is_deleted: 1 });
    
    // Compound indexes for common queries
    await Function.collection.createIndex({ is_deleted: 1, created_at: -1 });
    await Function.collection.createIndex({ function_id: 1, is_deleted: 1 });
    
    // Text index for full-text search (optional)
    await Function.collection.createIndex({
      function_name: 'text',
      function_owner_name: 'text',
      function_held_place: 'text',
      function_held_city: 'text'
    });
    
    console.log('Function indexes created successfully');
  } catch (error) {
    console.error('Error creating Function indexes:', error);
  }
};

export const createPayerIndexes = async () => {
  try {
    console.log('Creating Payer indexes...');
    
    // Individual field indexes for search optimization
    await Payer.collection.createIndex({ function_id: 1 });
    await Payer.collection.createIndex({ payer_name: 1 });
    await Payer.collection.createIndex({ payer_phno: 1 });
    await Payer.collection.createIndex({ payer_work: 1 });
    await Payer.collection.createIndex({ payer_cash_method: 1 });
    await Payer.collection.createIndex({ payer_amount: 1 });
    await Payer.collection.createIndex({ payer_relation: 1 });
    await Payer.collection.createIndex({ payer_city: 1 });
    await Payer.collection.createIndex({ created_at: -1 });
    await Payer.collection.createIndex({ is_deleted: 1 });
    
    // Compound indexes for common queries
    await Payer.collection.createIndex({ function_id: 1, is_deleted: 1 });
    await Payer.collection.createIndex({ function_id: 1, payer_name: 1 });
    await Payer.collection.createIndex({ function_id: 1, payer_phno: 1 });
    await Payer.collection.createIndex({ function_id: 1, created_at: -1 });
    await Payer.collection.createIndex({ is_deleted: 1, created_at: -1 });
    
    // Text index for full-text search (optional)
    await Payer.collection.createIndex({
      payer_name: 'text',
      payer_city: 'text',
      payer_work: 'text',
      payer_relation: 'text'
    });
    
    console.log('Payer indexes created successfully');
  } catch (error) {
    console.error('Error creating Payer indexes:', error);
  }
};

// Create all indexes
export const createAllIndexes = async () => {
  await createFunctionIndexes();
  await createPayerIndexes();
  // Add other collection indexes here
};