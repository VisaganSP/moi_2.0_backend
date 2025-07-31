// src/controllers/organization.controller.ts

import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Organization from '../models/Organization.model';
import User from '../models/User.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import slugify from 'slugify';
import { createOrganizationCollections, createOrganizationIndexes } from '../utils/dynamicCollections';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Define types for better type safety
type SubscriptionPlan = 'basic' | 'standard' | 'premium';

// Define the Subscription interface for proper typing
interface Subscription {
  max_functions: number;
  functions_created: number;
  subscription_plan: SubscriptionPlan;
  last_updated: Date;
  updated_by?: mongoose.Types.ObjectId;
}

// Define subscription plan base prices (max_functions is now flexible)
const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, { name: string; base_price: number; base_functions: number }> = {
  basic: { name: 'Basic Tier', base_price: 2500, base_functions: 10 },
  standard: { name: 'Standard Tier', base_price: 4500, base_functions: 25 },
  premium: { name: 'Premium Tier', base_price: 7500, base_functions: 40 }
};

// Helper function to validate subscription plan
const isValidSubscriptionPlan = (plan: any): plan is SubscriptionPlan => {
  return typeof plan === 'string' && ['basic', 'standard', 'premium'].includes(plan);
};

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private/SuperAdmin
export const createOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { display_name, org_name, settings } = req.body;

      // Generate slug if org_name not provided
      const orgNameValue = org_name || slugify(display_name, { lower: true, strict: true });

      // Check if organization already exists
      const existingOrg = await Organization.findOne({
        $or: [{ org_name: orgNameValue }, { display_name }]
      });

      if (existingOrg) {
        next(new ErrorResponse('Organization already exists', 400));
        return;
      }

      // Create organization - without using transaction
      const organization = await Organization.create({
        org_id: `org_${Date.now()}`,
        org_name: orgNameValue,
        display_name,
        settings: settings || {
          allow_multiple_sessions: false,
          session_timeout_minutes: 60
        }
      });

      try {
        // Create dynamic collections for this organization
        await createOrganizationCollections(
          organization._id.toString(),
          organization.org_name
        );
        
        // Create indexes for the new collections
        await createOrganizationIndexes(organization.org_name);
      } catch (collectionError) {
        // Log the error but don't fail the organization creation
        console.error('Error creating collections for organization:', collectionError);
        logger.error(`Failed to create collections for organization ${organization.org_name}, but organization was created`);
      }
      
      // Invalidate any relevant cache
      await invalidateCacheByPattern('api:/organizations*');

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to create organization: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to create organization due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private/SuperAdmin
export const getOrganizations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract query parameters
      const { page = 1, limit = 10, search } = req.query;

      // Build query
      const query: any = {};

      // Add search functionality
      if (search) {
        query.$or = [
          { org_name: { $regex: search, $options: 'i' } },
          { display_name: { $regex: search, $options: 'i' } }
        ];
      }

      console.log('Query for organizations:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await Organization.countDocuments(query);
      console.log('Total organizations found:', total);

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const startIndex = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const organizations = await Organization.find(query)
        .sort({ created_at: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .lean(); // Use lean for performance

      console.log(`Found ${organizations.length} organizations after pagination`);

      // Pagination result
      const pagination = {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      };

      res.status(200).json({
        success: true,
        count: organizations.length,
        pagination,
        data: organizations
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch organizations: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch organizations due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get public organizations list (minimal info for login dropdown)
// @route   GET /api/organizations/public
// @access  Public
export const getPublicOrganizations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizations = await Organization.find({})
        .select('org_name display_name')
        .sort({ display_name: 1 })
        .lean();

      res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
      });
    } catch (error) {
      console.error('Error fetching public organizations:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch public organizations: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch public organizations due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get single organization
// @route   GET /api/organizations/:orgName
// @access  Private/SuperAdmin
export const getOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName } = req.params;
      const organization = await Organization.findOne({ org_name: orgName }).lean();

      if (!organization) {
        next(new ErrorResponse(`Organization not found with org_name of ${orgName}`, 404));
        return;
      }

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch organization: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch organization due to an unknown error', 500));
      }
    }
  }
);

// @desc    Update organization
// @route   PUT /api/organizations/:orgName
// @access  Private/SuperAdmin
export const updateOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName } = req.params;
      let organization = await Organization.findOne({ org_name: orgName });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with org_name of ${orgName}`, 404));
        return;
      }

      // Cannot change org_name as it would break collection references
      if (req.body.org_name && req.body.org_name !== organization.org_name) {
        next(new ErrorResponse('Organization name cannot be changed as it would break database references', 400));
        return;
      }

      // Store original state for edit log
      const originalOrg = { ...organization.toObject() };

      // Update organization
      organization = await Organization.findOneAndUpdate(
        { org_name: orgName }, 
        { 
          ...req.body,
          updated_at: Date.now() 
        }, 
        {
          new: true,
          runValidators: true
        }
      );

      // Invalidate any relevant cache
      await invalidateCacheByPattern(`api:/organizations*`);
      await invalidateCacheByPattern(`api:/organizations/${orgName}*`);

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to update organization: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to update organization due to an unknown error', 500));
      }
    }
  }
);

// @desc    Delete organization
// @route   DELETE /api/organizations/:orgName
// @access  Private/SuperAdmin
export const deleteOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName } = req.params;
      const organization = await Organization.findOne({ org_name: orgName });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with org_name of ${orgName}`, 404));
        return;
      }

      // Check if organization has users (assuming users have org_name field)
      const userCount = await User.countDocuments({ org_name: orgName });
      if (userCount > 0) {
        next(new ErrorResponse(`Cannot delete organization with active users. Delete all users first.`, 400));
        return;
      }

      // Perform the delete operation
      await Organization.findOneAndDelete({ org_name: orgName });

      // Invalidate cache
      await invalidateCacheByPattern(`api:/organizations*`);
      await invalidateCacheByPattern(`api:/organizations/${orgName}*`);

      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      console.error('Error deleting organization:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to delete organization: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to delete organization due to an unknown error', 500));
      }
    }
  }
);

// @desc    Check if organization name exists
// @route   GET /api/organizations/check/:orgName
// @access  Public
export const checkOrganizationExists = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName } = req.params;
      
      const organization = await Organization.findOne({ 
        org_name: orgName 
      }).lean();

      res.status(200).json({
        success: true,
        exists: !!organization,
        data: organization ? {
          org_id: organization.org_id,
          display_name: organization.display_name
        } : null
      });
    } catch (error) {
      console.error('Error checking organization existence:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to check organization: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to check organization due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get organization stats
// @route   GET /api/organizations/stats
// @access  Private/SuperAdmin
export const getOrganizationStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalOrgs = await Organization.countDocuments();
      
      // Get counts of users per organization (using org_name)
      const usersByOrg = await User.aggregate([
        {
          $group: {
            _id: '$org_name',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Add organization details to each entry
      const detailedStats = await Promise.all(
        usersByOrg.map(async (item) => {
          const org = await Organization.findOne({ org_name: item._id }).select('display_name org_name').lean();
          return {
            org_name: item._id,
            count: item.count,
            display_name: org?.display_name || 'Unknown Organization'
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          total_organizations: totalOrgs,
          organizations_by_users: detailedStats
        }
      });
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch organization stats: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch organization stats due to an unknown error', 500));
      }
    }
  }
);

// @desc    Manage superadmins
// @route   POST /api/organizations/superadmins
// @access  Private/SuperAdmin
export const manageSuperadmin = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, action } = req.body;

      if (!userId || !['promote', 'demote'].includes(action)) {
        next(new ErrorResponse('Please provide a valid userId and action (promote/demote)', 400));
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        next(new ErrorResponse(`User not found with id of ${userId}`, 404));
        return;
      }

      // Prevent self-demotion
      if (user._id && req.user?._id && user._id.toString() === req.user._id.toString() && action === 'demote') {
        next(new ErrorResponse('You cannot demote yourself from superadmin', 400));
        return;
      }

      // Update user role
      if (action === 'promote') {
        user.isSuperAdmin = true;
      } else {
        user.isSuperAdmin = false;
      }

      await user.save();

      // Create edit log
      const EditLog = require('../models/EditLog.model').default;
      await EditLog.create({
        target_id: userId,
        target_type: 'User',
        action: action === 'promote' ? 'promote_to_superadmin' : 'demote_from_superadmin',
        before_value: { isSuperAdmin: action === 'promote' ? false : true },
        after_value: { isSuperAdmin: action === 'promote' ? true : false },
        reason: `User ${action === 'promote' ? 'promoted to' : 'demoted from'} superadmin role`,
        changed_fields: ['isSuperAdmin'],
        created_by: req.user?._id,
        user_email: req.user?.email,
        user_name: req.user?.username
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            isSuperAdmin: user.isSuperAdmin
          },
          message: `User ${action === 'promote' ? 'promoted to' : 'demoted from'} superadmin successfully`
        }
      });
    } catch (error) {
      console.error('Error managing superadmin:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to manage superadmin: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to manage superadmin due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get all superadmins
// @route   GET /api/organizations/superadmins
// @access  Private/SuperAdmin
export const getSuperadmins = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const superadmins = await User.find({ isSuperAdmin: true })
        .select('username email created_at')
        .sort({ created_at: -1 })
        .lean();

      res.status(200).json({
        success: true,
        count: superadmins.length,
        data: superadmins
      });
    } catch (error) {
      console.error('Error fetching superadmins:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch superadmins: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch superadmins due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get organization subscription status
// @route   GET /api/organizations/:orgName/subscription
// @access  Private (All authenticated users can access their own org subscription)
export const getOrganizationSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
        return;
      }

      const { orgName } = req.params;
      const isAdmin = req.user.isAdmin;
      const isSuperAdmin = req.user.isSuperAdmin;
      
      // Find organization by org_name (unique identifier)
      const organization = await Organization.findOne({ org_name: orgName });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with org_name of ${orgName}`, 404));
        return;
      }

      // For subscription access, we'll be permissive:
      // 1. SuperAdmins can access any organization
      // 2. Admins can access any organization
      // 3. Any authenticated user can access their own organization's subscription
      
      let hasAccess = false;
      
      if (isSuperAdmin || isAdmin) {
        // SuperAdmins and Admins can access any organization
        hasAccess = true;
      } else {
        // Check if user belongs to this organization
        if (req.user.org_name && req.user.org_name === orgName) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        next(new ErrorResponse('Not authorized to access this organization subscription', 403));
        return;
      }

      // Initialize subscription if it doesn't exist
      if (!organization.subscription) {
        // Create a properly typed subscription object with default basic plan
        const initialSubscription: Subscription = {
          max_functions: SUBSCRIPTION_PLANS.basic.base_functions,
          functions_created: 0,
          subscription_plan: 'basic',
          last_updated: new Date()
        };
        
        // Use type assertion to tell TypeScript we're setting the subscription property
        (organization as any).subscription = initialSubscription;
        await organization.save();
      }

      // Type assertion to ensure subscription is treated as defined
      const subscription = (organization.subscription as Subscription);

      // Get plan details
      const planDetails = SUBSCRIPTION_PLANS[subscription.subscription_plan] || SUBSCRIPTION_PLANS.basic;

      res.status(200).json({
        success: true,
        data: {
          org_id: organization.org_id,
          org_name: organization.org_name,
          display_name: organization.display_name,
          subscription: {
            subscription_plan: subscription.subscription_plan,
            max_functions: subscription.max_functions,
            functions_created: subscription.functions_created,
            functions_remaining: Math.max(0, subscription.max_functions - subscription.functions_created),
            last_updated: subscription.last_updated,
          },
          plan_details: {
            plan_name: subscription.subscription_plan,
            plan_display_name: planDetails.name,
            base_price: planDetails.base_price,
            base_functions: planDetails.base_functions,
            currency: 'INR'
          }
        },
      });
    } catch (error) {
      console.error('Error getting organization subscription:', error);
      next(
        new ErrorResponse(
          error instanceof Error
            ? `Failed to get organization subscription: ${error.message}`
            : 'Failed to get organization subscription due to an unknown error',
          500
        )
      );
    }
  }
);

// @desc    Update organization subscription limits
// @route   PUT /api/organizations/:orgName/subscription
// @access  Private (SuperAdmin only)
export const updateOrganizationSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
        return;
      }

      if (!req.user.isSuperAdmin) {
        next(new ErrorResponse('Not authorized as a superadmin', 403));
        return;
      }

      const { orgName } = req.params;
      const { max_functions, subscription_plan } = req.body;

      // Validate subscription plan if provided
      if (subscription_plan && !isValidSubscriptionPlan(subscription_plan)) {
        next(new ErrorResponse('Invalid subscription plan. Must be basic, standard, or premium', 400));
        return;
      }

      // Validate max_functions if provided
      if (max_functions !== undefined && max_functions < 0) {
        next(new ErrorResponse('max_functions must be a positive number', 400));
        return;
      }

      const organization = await Organization.findOne({ org_name: orgName });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with org_name of ${orgName}`, 404));
        return;
      }

      // Make sure we have a proper ObjectId for updated_by
      let updatedById: mongoose.Types.ObjectId;
      
      if (typeof req.user._id === 'string') {
        updatedById = new mongoose.Types.ObjectId(req.user._id);
      } else if (req.user._id instanceof mongoose.Types.ObjectId) {
        updatedById = req.user._id;
      } else {
        // Fallback if _id is in an unexpected format
        updatedById = new mongoose.Types.ObjectId();
      }

      // Determine the final values - full flexibility for max_functions
      let finalPlan: SubscriptionPlan = 'basic';
      let finalMaxFunctions = 10;

      if (subscription_plan && isValidSubscriptionPlan(subscription_plan)) {
        finalPlan = subscription_plan;
        // If max_functions is also provided, use that value, otherwise use current value or base value
        if (max_functions !== undefined) {
          finalMaxFunctions = max_functions;
        } else {
          finalMaxFunctions = (organization.subscription as any)?.max_functions || SUBSCRIPTION_PLANS[subscription_plan].base_functions;
        }
      } else if (max_functions !== undefined) {
        finalMaxFunctions = max_functions;
        // Keep existing plan if available, otherwise set to basic
        const existingPlan = (organization.subscription as any)?.subscription_plan;
        finalPlan = isValidSubscriptionPlan(existingPlan) ? existingPlan : 'basic';
      } else {
        // Keep existing values if available
        const existingPlan = (organization.subscription as any)?.subscription_plan;
        finalPlan = isValidSubscriptionPlan(existingPlan) ? existingPlan : 'basic';
        finalMaxFunctions = (organization.subscription as any)?.max_functions || 10;
      }

      // Initialize or update subscription with proper types
      if (!organization.subscription) {
        const newSubscription: Subscription = {
          max_functions: finalMaxFunctions,
          functions_created: 0,
          subscription_plan: finalPlan,
          last_updated: new Date(),
          updated_by: updatedById
        };
        
        // Use type assertion to safely set the property
        (organization as any).subscription = newSubscription;
      } else {
        // Use type assertion to access subscription properties
        const subscription = (organization.subscription as Subscription);
        subscription.max_functions = finalMaxFunctions;
        subscription.subscription_plan = finalPlan;
        subscription.last_updated = new Date();
        subscription.updated_by = updatedById;
      }

      await organization.save();

      await invalidateCacheByPattern(`api:/organizations*`);
      await invalidateCacheByPattern(`api:/organizations/${orgName}*`);

      // Safe type assertion for response
      const subscription = (organization.subscription as Subscription);
      const planDetails = SUBSCRIPTION_PLANS[subscription.subscription_plan];

      res.status(200).json({
        success: true,
        data: {
          org_id: organization.org_id,
          org_name: organization.org_name,
          subscription: {
            subscription_plan: subscription.subscription_plan,
            max_functions: subscription.max_functions,
            functions_created: subscription.functions_created,
            functions_remaining: Math.max(0, subscription.max_functions - subscription.functions_created),
            last_updated: subscription.last_updated,
          },
          plan_details: {
            plan_name: subscription.subscription_plan,
            plan_display_name: planDetails.name,
            base_price: planDetails.base_price,
            base_functions: planDetails.base_functions,
            currency: 'INR'
          }
        },
      });
    } catch (error) {
      console.error('Error updating organization subscription:', error);
      next(
        new ErrorResponse(
          error instanceof Error
            ? `Failed to update organization subscription: ${error.message}`
            : 'Failed to update organization subscription due to an unknown error',
          500
        )
      );
    }
  }
);

// @desc    Get subscription plans information
// @route   GET /api/organizations/subscription-plans
// @access  Public
export const getSubscriptionPlans = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = [
        {
          plan: 'basic',
          name: 'Basic Tier',
          base_price: 2500,
          currency: 'INR',
          billing_period: 'monthly',
          base_functions: 10,
          features: [
            'Unlimited user accounts',
            'Base 10 Functions/Events per month (customizable)',
            'Basic reporting features',
            'Standard email support'
          ]
        },
        {
          plan: 'standard',
          name: 'Standard Tier',
          base_price: 4500,
          currency: 'INR',
          billing_period: 'monthly',
          base_functions: 25,
          features: [
            'Unlimited user accounts',
            'Base 25 Functions/Events per month (customizable)',
            'Function Analytics Reports included',
            'Advanced reporting capabilities',
            'Priority email support'
          ]
        },
        {
          plan: 'premium',
          name: 'Premium Tier',
          base_price: 7500,
          currency: 'INR',
          billing_period: 'monthly',
          base_functions: 40,
          features: [
            'Unlimited user accounts',
            'Base 40 Functions/Events per month (customizable)',
            'Advanced Reporting with Charts (exclusive feature)',
            'Function Analytics Reports',
            'Comprehensive business analytics',
            'Premium priority support (phone + email)'
          ]
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          plans,
          note: 'All subscription tiers include unlimited user accounts. Function limits are customizable by administrators.'
        }
      });
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch subscription plans: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch subscription plans due to an unknown error', 500));
      }
    }
  }
);