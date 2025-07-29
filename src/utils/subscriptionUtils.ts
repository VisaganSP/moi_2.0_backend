import { NextFunction } from 'express';
import mongoose from 'mongoose';
import { ErrorResponse } from './errorResponse';
import { AuthenticatedRequest } from '../types';
import Organization from '../models/Organization.model';

// Define types for better type safety
type SubscriptionPlan = 'basic' | 'standard' | 'premium';

/**
 * Checks if an organization has reached its function creation limit
 * @param req - Authenticated request object
 * @param next - Express next function
 * @returns Promise<boolean> - True if limit is reached, false otherwise
 */
export const checkFunctionLimit = async (
  req: AuthenticatedRequest,
  next: NextFunction
): Promise<boolean> => {
  try {
    // Get organization info from the authenticated user
    const orgName = req.user?.org_name;
    const orgId = req.user?.org_id;
    
    if (!orgName || !orgId) {
      next(new ErrorResponse('User organization information is missing', 400));
      return true; // Return true to prevent function creation
    }
    
    // Find the organization by org_name (since we changed to use org_name as identifier)
    const organization = await Organization.findOne({ org_name: orgName });
    
    if (!organization) {
      next(new ErrorResponse(`Organization not found with org_name ${orgName}`, 404));
      return true;
    }
    
    // Check if the organization has subscription data
    if (!organization.subscription) {
      // Initialize subscription data if it doesn't exist with all required fields
      organization.subscription = {
        subscription_plan: 'basic' as SubscriptionPlan,
        max_functions: 10,
        functions_created: 0,
        last_updated: new Date()
      };
      await organization.save();
      return false; // Allow function creation since we just initialized
    }
    
    const { max_functions, functions_created } = organization.subscription;
    
    // Check if the limit is reached
    if (functions_created >= max_functions) {
      next(
        new ErrorResponse(
          `Function creation limit reached (${functions_created}/${max_functions}). Please contact the Software Administrators at Visainnovations to increase your limit.`,
          403
        )
      );
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking function limit:', error);
    next(new ErrorResponse('Error checking function subscription limit', 500));
    return true;
  }
};

/**
 * Increments the functions_created counter for an organization
 * @param req - Authenticated request object
 * @returns Promise<void>
 */
export const incrementFunctionCount = async (
  req: AuthenticatedRequest
): Promise<void> => {
  try {
    const orgName = req.user?.org_name;
    
    if (!orgName) {
      return;
    }
    
    // Update the functions_created counter using org_name
    await Organization.findOneAndUpdate(
      { org_name: orgName },
      { 
        $inc: { 'subscription.functions_created': 1 },
        $set: { 'subscription.last_updated': new Date() },
        // If subscription doesn't exist, initialize it with all required fields
        $setOnInsert: {
          'subscription.subscription_plan': 'basic',
          'subscription.max_functions': 10,
          'subscription.functions_created': 1, // Set to 1 since we're incrementing
          'subscription.last_updated': new Date()
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error incrementing function count:', error);
    // Don't throw error here, just log it
  }
};

/**
 * Decrements the functions_created counter for an organization (for function deletion)
 * @param req - Authenticated request object
 * @returns Promise<void>
 */
export const decrementFunctionCount = async (
  req: AuthenticatedRequest
): Promise<void> => {
  try {
    const orgName = req.user?.org_name;
    
    if (!orgName) {
      return;
    }
    
    // Update the functions_created counter, ensuring it doesn't go below 0
    await Organization.findOneAndUpdate(
      { 
        org_name: orgName,
        'subscription.functions_created': { $gt: 0 } // Only decrement if count > 0
      },
      { 
        $inc: { 'subscription.functions_created': -1 },
        $set: { 'subscription.last_updated': new Date() }
      }
    );
  } catch (error) {
    console.error('Error decrementing function count:', error);
    // Don't throw error here, just log it
  }
};

/**
 * Get organization subscription details
 * @param orgName - Organization name
 * @returns Promise<object | null> - Subscription details or null if not found
 */
export const getOrganizationSubscription = async (
  orgName: string
): Promise<{
  subscription_plan: SubscriptionPlan;
  max_functions: number;
  functions_created: number;
  functions_remaining: number;
  last_updated: Date;
} | null> => {
  try {
    const organization = await Organization.findOne({ org_name: orgName });
    
    if (!organization || !organization.subscription) {
      return null;
    }
    
    const subscription = organization.subscription as any;
    
    return {
      subscription_plan: subscription.subscription_plan || 'basic',
      max_functions: subscription.max_functions || 10,
      functions_created: subscription.functions_created || 0,
      functions_remaining: Math.max(0, (subscription.max_functions || 10) - (subscription.functions_created || 0)),
      last_updated: subscription.last_updated || new Date()
    };
  } catch (error) {
    console.error('Error getting organization subscription:', error);
    return null;
  }
};