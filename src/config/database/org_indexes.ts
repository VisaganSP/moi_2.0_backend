import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import Organization from '../../models/Organization.model';
import User from '../../models/User.model';
import { createOrganizationIndexes as createOrgCollectionIndexes } from '../../utils/dynamicCollections';

/**
 * Creates indexes for all base collections
 */
export const createAllIndexes = async (): Promise<void> => {
  try {
    logger.info('Creating database indexes...');
    
    // Ensure connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('MongoDB connection not established');
      return;
    }
    
    // Create indexes for User collection
    await createUserIndexes();
    
    // Create indexes for Organization collection
    await createOrganizationBaseIndexes();
    
    // Create indexes for each organization's collections
    await createAllOrganizationCollectionIndexes();
    
    logger.info('All database indexes created successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating database indexes: ${error.message}`);
    } else {
      logger.error('Unknown error creating database indexes');
    }
  }
};

/**
 * Creates indexes for the User collection
 */
const createUserIndexes = async (): Promise<void> => {
  try {
    logger.info('Creating User collection indexes...');
    
    // Ensure connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('MongoDB connection not established');
      return;
    }
    
    // Get the User collection
    const userCollection = mongoose.connection.collection('users');
    
    // Create indexes
    await userCollection.createIndexes([
      { key: { email: 1, org_name: 1 }, unique: true, name: 'email_org_index' },
      { key: { username: 1 }, name: 'username_index' },
      { key: { org_id: 1 }, name: 'org_id_index' },
      { key: { isSuperAdmin: 1 }, name: 'superadmin_index' }
    ]);
    
    logger.info('User collection indexes created successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating User indexes: ${error.message}`);
    } else {
      logger.error('Unknown error creating User indexes');
    }
    // Continue execution even if index creation fails
  }
};

/**
 * Creates indexes for the Organization collection
 * Renamed to avoid conflict with the imported function
 */
const createOrganizationBaseIndexes = async (): Promise<void> => {
  try {
    logger.info('Creating Organization collection indexes...');
    
    // Ensure connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('MongoDB connection not established');
      return;
    }
    
    // Get the Organization collection
    const organizationCollection = mongoose.connection.collection('organizations');
    
    // Create indexes
    await organizationCollection.createIndexes([
      { key: { org_id: 1 }, unique: true, name: 'org_id_index' },
      { key: { org_name: 1 }, unique: true, name: 'org_name_index' },
      { key: { display_name: 1 }, name: 'display_name_index' }
    ]);
    
    logger.info('Organization collection indexes created successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating Organization indexes: ${error.message}`);
    } else {
      logger.error('Unknown error creating Organization indexes');
    }
    // Continue execution even if index creation fails
  }
};

/**
 * Creates indexes for all organization-specific collections
 */
const createAllOrganizationCollectionIndexes = async (): Promise<void> => {
  try {
    logger.info('Creating indexes for all organization-specific collections...');
    
    // Ensure connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('MongoDB connection not established');
      return;
    }
    
    // Get all organizations
    const organizations = await Organization.find({}).select('org_name').lean();
    
    // Create indexes for each organization
    for (const org of organizations) {
      try {
        // Use the imported function from dynamicCollections.ts
        await createOrgCollectionIndexes(org.org_name);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error creating indexes for organization ${org.org_name}: ${error.message}`);
        } else {
          logger.error(`Unknown error creating indexes for organization ${org.org_name}`);
        }
        // Continue with the next organization even if one fails
      }
    }
    
    logger.info('All organization-specific collection indexes created successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating organization-specific collection indexes: ${error.message}`);
    } else {
      logger.error('Unknown error creating organization-specific collection indexes');
    }
  }
};