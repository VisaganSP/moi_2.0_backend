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
        // Removed .populate('created_by') since it's not in the schema

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
// @route   GET /api/organizations/:id
// @access  Private/SuperAdmin
export const getOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Removed the .populate('created_by') call since it's not in the schema
      const organization = await Organization.findById(req.params.id).lean();

      if (!organization) {
        next(new ErrorResponse(`Organization not found with id of ${req.params.id}`, 404));
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
// @route   PUT /api/organizations/:id
// @access  Private/SuperAdmin
export const updateOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let organization = await Organization.findById(req.params.id);

      if (!organization) {
        next(new ErrorResponse(`Organization not found with id of ${req.params.id}`, 404));
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
      organization = await Organization.findByIdAndUpdate(
        req.params.id, 
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
      await invalidateCacheByPattern(`api:/organizations/${req.params.id}*`);

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
// @route   DELETE /api/organizations/:id
// @access  Private/SuperAdmin
export const deleteOrganization = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await Organization.findById(req.params.id);

      if (!organization) {
        next(new ErrorResponse(`Organization not found with id of ${req.params.id}`, 404));
        return;
      }

      // Check if organization has users
      const userCount = await User.countDocuments({ org_id: organization._id });
      if (userCount > 0) {
        next(new ErrorResponse(`Cannot delete organization with active users. Delete all users first.`, 400));
        return;
      }

      // Perform the delete operation
      await Organization.findByIdAndDelete(req.params.id);

      // Invalidate cache
      await invalidateCacheByPattern(`api:/organizations*`);
      await invalidateCacheByPattern(`api:/organizations/${req.params.id}*`);

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
      
      // Get counts of users per organization
      const usersByOrg = await User.aggregate([
        {
          $group: {
            _id: '$org_id',
            count: { $sum: 1 },
            org_name: { $first: '$org_name' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Add organization details to each entry
      const detailedStats = await Promise.all(
        usersByOrg.map(async (item) => {
          const org = await Organization.findById(item._id).select('display_name org_name').lean();
          return {
            ...item,
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

// Define the Subscription interface for proper typing
interface Subscription {
  max_functions: number;
  functions_created: number;
  last_updated: Date;
  updated_by?: mongoose.Types.ObjectId;
}

// @desc    Get organization subscription status
// @route   GET /api/organizations/:id/subscription
// @access  Private (Admin for any org, or regular user for their own org)
export const getOrganizationSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.isAdmin;
      const isSuperAdmin = req.user.isSuperAdmin;
      
      // Get user's organization first to compare org_id values properly
      const userOrganization = await Organization.findById(req.user.org_id);
      // Now we can compare string with string - both org_id fields
      const isOwnOrg = userOrganization ? userOrganization.org_id === id : false;

      if (!isAdmin && !isSuperAdmin && !isOwnOrg) {
        next(new ErrorResponse('Not authorized to access this resource', 403));
        return;
      }

      const organization = await Organization.findOne({ org_id: id });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with id of ${id}`, 404));
        return;
      }

      // Initialize subscription if it doesn't exist
      if (!organization.subscription) {
        // Create a properly typed subscription object
        const initialSubscription: Subscription = {
          max_functions: 10,
          functions_created: 0,
          last_updated: new Date()
        };
        
        // Use type assertion to tell TypeScript we're setting the subscription property
        (organization as any).subscription = initialSubscription;
        await organization.save();
      }

      // Type assertion to ensure subscription is treated as defined
      const subscription = (organization.subscription as Subscription);

      res.status(200).json({
        success: true,
        data: {
          org_id: organization.org_id,
          org_name: organization.org_name,
          display_name: organization.display_name,
          subscription: {
            max_functions: subscription.max_functions,
            functions_created: subscription.functions_created,
            functions_remaining: Math.max(0, subscription.max_functions - subscription.functions_created),
            last_updated: subscription.last_updated,
          },
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
// @route   PUT /api/organizations/:id/subscription
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

      const { id } = req.params;
      const { max_functions } = req.body;

      if (max_functions === undefined || max_functions < 0) {
        next(new ErrorResponse('Valid max_functions value is required', 400));
        return;
      }

      const organization = await Organization.findOne({ org_id: id });

      if (!organization) {
        next(new ErrorResponse(`Organization not found with id of ${id}`, 404));
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

      // Initialize or update subscription with proper types
      if (!organization.subscription) {
        const newSubscription: Subscription = {
          max_functions,
          functions_created: 0,
          last_updated: new Date(),
          updated_by: updatedById
        };
        
        // Use type assertion to safely set the property
        (organization as any).subscription = newSubscription;
      } else {
        // Use type assertion to access subscription properties
        const subscription = (organization.subscription as Subscription);
        subscription.max_functions = max_functions;
        subscription.last_updated = new Date();
        subscription.updated_by = updatedById;
      }

      await organization.save();

      await invalidateCacheByPattern(`api:/organizations*`);
      await invalidateCacheByPattern(`api:/organizations/${id}*`);

      // Safe type assertion for response
      const subscription = (organization.subscription as Subscription);

      res.status(200).json({
        success: true,
        data: {
          org_id: organization.org_id,
          org_name: organization.org_name,
          subscription: {
            max_functions: subscription.max_functions,
            functions_created: subscription.functions_created,
            functions_remaining: Math.max(0, subscription.max_functions - subscription.functions_created),
            last_updated: subscription.last_updated,
          },
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