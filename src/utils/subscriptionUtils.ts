import { NextFunction } from 'express';
import mongoose from 'mongoose';
import { ErrorResponse } from './errorResponse';
import { AuthenticatedRequest } from '../types';
import Organization from '../models/Organization.model';

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
    
    // Find the organization by _id (MongoDB ObjectId) instead of org_id (string)
    // This is the key fix - using findById for ObjectId fields
    const organization = await Organization.findById(orgId);
    
    if (!organization) {
      next(new ErrorResponse(`Organization not found with id ${orgId}`, 404));
      return true;
    }
    
    // Check if the organization has subscription data
    if (!organization.subscription) {
      // Initialize subscription data if it doesn't exist
      organization.subscription = {
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
    const orgId = req.user?.org_id;
    
    if (!orgId) {
      return;
    }
    
    // Update the functions_created counter using findByIdAndUpdate
    // (not findOneAndUpdate with org_id)
    await Organization.findByIdAndUpdate(
      orgId,
      { 
        $inc: { 'subscription.functions_created': 1 },
        // If subscription doesn't exist, initialize it
        $setOnInsert: {
          'subscription.max_functions': 10,
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