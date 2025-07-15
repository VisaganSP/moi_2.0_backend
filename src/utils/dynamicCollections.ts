// src/utils/dynamicCollections.ts

import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Define collection schemas that will be used for each organization
const collectionSchemas = {
  functions: new mongoose.Schema({
    function_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    function_name: {
      type: String,
      required: true,
      trim: true
    },
    function_owner_name: String,
    function_owner_city: String,
    function_owner_address: String,
    function_owner_phno: String,
    function_amt_spent: {
      type: Number,
      default: 0
    },
    function_hero_name: String,
    function_heroine_name: String,
    function_held_place: String,
    function_held_city: String,
    function_start_date: Date,
    function_start_time: String,
    function_end_date: Date,
    function_end_time: String,
    function_total_days: {
      type: Number,
      default: 1
    },
    function_bill_details: {
      owner_name: String,
      owner_occupation: String,
      wife_name: String,
      wife_occupation: String,
      function_place: String,
      function_city: String
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    org_name: {
      type: String,
      required: true
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
    deleted_at: Date,
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  }),
  
  payers: new mongoose.Schema({
    function_id: {
      type: String,
      required: true
    },
    function_name: {
      type: String,
      required: true
    },
    payer_name: {
      type: String,
      required: true,
      trim: true
    },
    payer_phno: String,
    payer_work: String,
    payer_given_object: String,
    payer_cash_method: {
      type: String,
      enum: ['Cash', 'Online', 'Cheque', 'Gift'],
      default: 'Cash'
    },
    payer_amount: {
      type: Number,
      default: 0
    },
    payer_gift_name: String,
    payer_relation: String,
    payer_city: String,
    payer_address: String,
    current_date: Date,
    current_time: String,
    denominations_received: {
      "2000": { type: Number, default: 0 },
      "500": { type: Number, default: 0 },
      "200": { type: Number, default: 0 },
      "100": { type: Number, default: 0 },
      "50": { type: Number, default: 0 },
      "20": { type: Number, default: 0 },
      "10": { type: Number, default: 0 },
      "5": { type: Number, default: 0 },
      "2": { type: Number, default: 0 },
      "1": { type: Number, default: 0 }
    },
    total_received: {
      type: Number,
      default: 0
    },
    denominations_returned: {
      "2000": { type: Number, default: 0 },
      "500": { type: Number, default: 0 },
      "200": { type: Number, default: 0 },
      "100": { type: Number, default: 0 },
      "50": { type: Number, default: 0 },
      "20": { type: Number, default: 0 },
      "10": { type: Number, default: 0 },
      "5": { type: Number, default: 0 },
      "2": { type: Number, default: 0 },
      "1": { type: Number, default: 0 }
    },
    total_returned: {
      type: Number,
      default: 0
    },
    net_amount: {
      type: Number,
      default: 0
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    org_name: {
      type: String,
      required: true
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
    deleted_at: Date,
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  }),
  
  payer_profiles: new mongoose.Schema({
    payer_name: {
      type: String,
      required: true,
      trim: true
    },
    payer_phno: String,
    payer_work: String,
    payer_city: String,
    payer_address: String,
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    org_name: {
      type: String,
      required: true
    },
    functions_contributed: [
      {
        function_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Function'
        },
        function_name: String,
        contribution_date: Date,
        amount: Number
      }
    ],
    last_updated: {
      type: Date,
      default: Date.now
    }
  }),
  
  edit_logs: new mongoose.Schema({
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    target_type: {
      type: String,
      enum: ['Function', 'Payer', 'Organization', 'User'],
      required: true
    },
    action: {
      type: String,
      enum: ['update', 'delete', 'restore', 'promote_to_superadmin', 'demote_from_superadmin'],
      required: true
    },
    before_value: mongoose.Schema.Types.Mixed,
    after_value: mongoose.Schema.Types.Mixed,
    reason: String,
    changed_fields: [String],
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_email: String,
    user_name: String,
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    org_name: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  })
};

// Function to create all collections for a specific organization
export const createOrganizationCollections = async (orgId: string, orgName: string): Promise<void> => {
  try {
    logger.info(`Creating collections for organization: ${orgName} (${orgId})`);
    
    const collectionPrefix = orgName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Make sure we have a connection before proceeding
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error('MongoDB connection not established');
    }
    
    // Create each collection with organization-specific name
    for (const [collectionType, schema] of Object.entries(collectionSchemas)) {
      const collectionName = `${collectionPrefix}_${collectionType}`;
      
      // Check if collection already exists
      const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        // Create the collection with the schema
        logger.info(`Creating collection: ${collectionName}`);
        
        // Register the model with mongoose
        mongoose.model(collectionName, schema);
        
        // Create the collection in MongoDB
        await mongoose.connection.createCollection(collectionName);
        
        logger.info(`Collection ${collectionName} created successfully`);
      } else {
        logger.info(`Collection ${collectionName} already exists, skipping`);
      }
    }
    
    logger.info(`All collections created for organization: ${orgName} (${orgId})`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating collections for organization ${orgName}: ${error.message}`);
      throw error;
    } else {
      logger.error(`Unknown error creating collections for organization ${orgName}`);
      throw new Error(`Unknown error creating collections for organization ${orgName}`);
    }
  }
};

// Function to get a model for a specific organization and collection type
export const getOrganizationModel = <T = any>(orgName: string, collectionType: 'functions' | 'payers' | 'payer_profiles' | 'edit_logs') => {
  const collectionPrefix = orgName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const collectionName = `${collectionPrefix}_${collectionType}`;
  
  try {
    // Try to get the model if it exists
    return mongoose.model<T>(collectionName);
  } catch (error) {
    // If model doesn't exist, create it
    if (collectionSchemas[collectionType]) {
      return mongoose.model<T>(collectionName, collectionSchemas[collectionType]);
    } else {
      throw new Error(`Schema not found for collection type: ${collectionType}`);
    }
  }
};

// Function to create indexes for all organization collections
export const createOrganizationIndexes = async (orgName: string): Promise<void> => {
  try {
    const collectionPrefix = orgName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Ensure connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('MongoDB connection not established');
      return;
    }
    
    // Create indexes for functions collection
    const functionsCollection = `${collectionPrefix}_functions`;
    await mongoose.connection.collection(functionsCollection).createIndexes([
      { key: { function_id: 1 }, unique: true },
      { key: { function_name: 1 }, name: 'function_name_index' },
      { key: { created_by: 1 }, name: 'created_by_index' }
    ]);
    
    // Create indexes for payers collection
    const payersCollection = `${collectionPrefix}_payers`;
    await mongoose.connection.collection(payersCollection).createIndexes([
      { key: { function_id: 1, payer_name: 1 }, name: 'function_payer_index' },
      { key: { payer_name: 1 }, name: 'payer_name_index' },
      { key: { payer_phno: 1 }, name: 'payer_phno_index' }
    ]);
    
    // Create indexes for payer profiles collection
    const profilesCollection = `${collectionPrefix}_payer_profiles`;
    await mongoose.connection.collection(profilesCollection).createIndexes([
      { key: { payer_name: 1, payer_phno: 1 }, unique: true, name: 'payer_unique_index' },
      { key: { payer_name: 1 }, name: 'payer_name_index' }
    ]);
    
    // Create indexes for edit logs collection
    const logsCollection = `${collectionPrefix}_edit_logs`;
    await mongoose.connection.collection(logsCollection).createIndexes([
      { key: { target_id: 1, action: 1 }, name: 'target_action_index' },
      { key: { created_by: 1 }, name: 'creator_index' },
      { key: { created_at: -1 }, name: 'created_at_index' }
    ]);
    
    logger.info(`Created indexes for all collections of organization: ${orgName}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating indexes for organization ${orgName}: ${error.message}`);
    } else {
      logger.error(`Unknown error creating indexes for organization ${orgName}`);
    }
    // Continue execution even if index creation fails
  }
};