import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest, FunctionDocument, PayerDocument } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import { findChangedFields, sanitizeForEditLog } from '../utils/editLogHelpers';
import { FUNCTION_SEARCHABLE_FIELDS } from '../utils/constants';
import { getOrganizationModel } from '../utils/dynamicCollections';
import { checkFunctionLimit, incrementFunctionCount } from '../utils/subscriptionUtils';

// @desc    Create a new function (Admin only)
// @route   POST /api/functions
// @access  Private/Admin
export const createFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      const orgId = req.user.org_id;
      
      if (!orgName || !orgId) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }

      // Check if the organization has reached its function limit
      const limitReached = await checkFunctionLimit(req, next);
      if (limitReached) {
        return; // Stop execution if limit is reached
      }

      // Add user id and organization info to request body
      req.body.created_by = req.user._id;
      req.body.org_id = orgId;
      req.body.org_name = orgName;
      
      // Generate the unique function_id based on the specified pattern
      // Format: function_name-function_owner_name-function_held_city-function_start_date-function_start_time
      const { 
        function_name,
        function_owner_name,
        function_held_city,
        function_start_date,
        function_start_time
      } = req.body;
      
      // Validate required fields
      if (!function_name || !function_owner_name || !function_held_city || 
          !function_start_date || !function_start_time) {
        next(new ErrorResponse('Missing required fields for function_id generation', 400));
        return;
      }
      
      // Format the date part (assuming function_start_date is in ISO format)
      const startDate = new Date(function_start_date);
      const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Create the function_id by joining fields with hyphens and replacing spaces with underscores
      const function_id = [
        function_name,
        function_owner_name,
        function_held_city,
        formattedDate,
        function_start_time
      ].map(part => String(part).replace(/\s+/g, '_').toLowerCase()).join('-');
      
      // Add the function_id to the request body
      req.body.function_id = function_id;
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel<FunctionDocument>(orgName, 'functions');
      
      // Create function with the added function_id in the organization-specific collection
      const functionObj = await FunctionModel.create(req.body);

      // Increment the functions_created counter for the organization
      await incrementFunctionCount(req);

      // Invalidate cache
      await invalidateCacheByPattern('api:/functions*');

      res.status(201).json({
        success: true,
        function_id: function_id, // Include the function_id prominently in the response
        data: functionObj
      });
    } catch (error) {
      console.error('Error creating function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to create function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to create function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get all functions
// @route   GET /api/functions
// @access  Private
export const getFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Invalidate cache to ensure fresh data
      await invalidateCacheByPattern('api:/functions*');

      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel<FunctionDocument>(orgName, 'functions');

      // Build query
      const query: any = { is_deleted: false };
      
      // Add search functionality
      if (req.query.search) {
        query.function_name = { $regex: req.query.search, $options: 'i' };
      }

      console.log('Query for functions:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await FunctionModel.countDocuments(query);
      console.log('Total functions found:', total);

      // Add pagination if requested
      let functions;
      if (req.query.page || req.query.limit) {
        // Parse pagination parameters
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const startIndex = (page - 1) * limit;
        
        // Execute query with pagination
        functions = await FunctionModel.find(query)
          .sort({ created_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean(); // Use lean for performance
          
        console.log(`Found ${functions.length} functions after pagination`);
        
        // Pagination result
        const pagination = {
          current: page,
          pages: Math.ceil(total / limit),
          total
        };
        
        res.status(200).json({
          success: true,
          count: functions.length,
          pagination,
          data: functions
        });
      } else {
        // No pagination, return all results
        functions = await FunctionModel.find(query)
          .sort({ created_at: -1 })
          .lean(); // Use lean for performance
        
        console.log(`Found ${functions.length} functions total (no pagination)`);
        
        res.status(200).json({
          success: true,
          count: functions.length,
          data: functions
        });
      }
    } catch (error) {
      console.error('Error fetching functions:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch functions: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch functions due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get function by ID
// @route   GET /api/functions/:id
// @access  Private
export const getFunctionById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Use function_id instead of _id
      const functionObj = await FunctionModel.findOne({
        function_id: req.params.id,
        is_deleted: false
      });

      if (!functionObj) {
        next(new ErrorResponse('Function not found', 404));
        return;
      }

      res.status(200).json({
        success: true,
        data: functionObj
      });
    } catch (error) {
      console.error('Error fetching function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Update function (Admin only)
// @route   PUT /api/functions/:id
// @access  Private/Admin
export const updateFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      const orgId = req.user.org_id;
      
      if (!orgName || !orgId) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function and EditLog models
      const FunctionModel = getOrganizationModel<FunctionDocument>(orgName, 'functions');
      const EditLogModel = getOrganizationModel(orgName, 'edit_logs');
      
      // Extract reason_for_edit from request body
      const { reason_for_edit, ...updateData } = req.body;
      
      // Validate reason for edit
      if (!reason_for_edit) {
        next(new ErrorResponse('Reason for edit is required', 400));
        return;
      }

      // Find by function_id instead of _id
      let functionObj = await FunctionModel.findOne({
        function_id: req.params.id,
        is_deleted: false
      });

      if (!functionObj) {
        next(new ErrorResponse('Function not found', 404));
        return;
      }

      // Store the original state for edit log
      const beforeValue = sanitizeForEditLog(functionObj.toObject());

      // Do not allow updating the function_id itself
      if (updateData.function_id) {
        delete updateData.function_id;
      }

      // Handle function_bill_details updates with new fields
      if (updateData.function_bill_details) {
        const billDetails = updateData.function_bill_details;
        
        // Validate and process logo image if present
        if (billDetails.logo_image) {
          // Validate base64 image format
          const base64Regex = /^data:image\/(jpeg|jpg|png|gif);base64,/;
          if (!base64Regex.test(billDetails.logo_image)) {
            next(new ErrorResponse('Invalid image format. Only JPEG, PNG, and GIF are supported', 400));
            return;
          }
          
          // Check image size (2MB limit for base64)
          const imageSize = (billDetails.logo_image.length * 3) / 4 - 2; // Approximate base64 to bytes
          if (imageSize > 2 * 1024 * 1024) {
            next(new ErrorResponse('Image size exceeds 2MB limit', 400));
            return;
          }
        }
        
        // Process advertisement settings with defaults
        if (billDetails.advertisement_settings) {
          const adSettings = {
            ad_title: billDetails.advertisement_settings.ad_title || 'MOITECH',
            ad_subtitle: billDetails.advertisement_settings.ad_subtitle || 'For all your tech needs',
            ad_phone: billDetails.advertisement_settings.ad_phone || '7339124748, 9894454345'
          };
          billDetails.advertisement_settings = adSettings;
        }
        
        // Process font settings with defaults
        if (billDetails.font_settings) {
          const fontSettings = {
            base_font_size: Math.max(8, Math.min(20, billDetails.font_settings.base_font_size || 12)), // Clamp between 8-20px
            company_name_size: Math.max(10, Math.min(24, billDetails.font_settings.company_name_size || 14)),
            header_size: Math.max(8, Math.min(18, billDetails.font_settings.header_size || 12)),
            customer_name_size: Math.max(10, Math.min(22, billDetails.font_settings.customer_name_size || 16)),
            amount_size: Math.max(12, Math.min(24, billDetails.font_settings.amount_size || 18))
          };
          billDetails.font_settings = fontSettings;
        }
        
        // Merge existing function_bill_details with new data
        const existingBillDetails = functionObj.function_bill_details || {};
        updateData.function_bill_details = {
          ...existingBillDetails,
          ...billDetails
        };
      }

      // Update function using its MongoDB _id
      functionObj = await FunctionModel.findByIdAndUpdate(functionObj._id, updateData, {
        new: true,
        runValidators: true
      });

      // Calculate which fields were changed
      const changedFields = findChangedFields(beforeValue, sanitizeForEditLog(functionObj!.toObject()));

      // Create edit log in the organization-specific edit_logs collection
      await EditLogModel.create({
        target_id: functionObj!._id,
        target_type: 'Function',
        action: 'update',
        before_value: beforeValue,
        after_value: sanitizeForEditLog(functionObj!.toObject()),
        reason: reason_for_edit,
        changed_fields: changedFields,
        created_by: req.user._id,
        user_email: req.user.email,
        user_name: req.user.username,
        org_id: orgId,
        org_name: orgName
      });

      // Invalidate cache
      await invalidateCacheByPattern('api:/functions*');
      await invalidateCacheByPattern(`api:/functions/${req.params.id}`);
      await invalidateCacheByPattern('api:/edit-logs*');

      res.status(200).json({
        success: true,
        data: functionObj
      });
    } catch (error) {
      console.error('Error updating function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to update function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to update function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Delete function (soft delete) (Admin only)
// @route   DELETE /api/functions/:id
// @access  Private/Admin
export const deleteFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Find by function_id instead of _id
      const functionObj = await FunctionModel.findOne({
        function_id: req.params.id,
        is_deleted: false
      });

      if (!functionObj) {
        next(new ErrorResponse('Function not found', 404));
        return;
      }

      // Soft delete
      functionObj.is_deleted = true;
      functionObj.deleted_at = new Date();
      await functionObj.save();

      // Invalidate cache
      await invalidateCacheByPattern('api:/functions*');
      await invalidateCacheByPattern(`api:/functions/${req.params.id}`);

      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      console.error('Error deleting function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to delete function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to delete function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Restore deleted function (Admin only)
// @route   PUT /api/functions/:id/restore
// @access  Private/Admin
export const restoreFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Find by function_id instead of _id
      const functionObj = await FunctionModel.findOne({
        function_id: req.params.id,
        is_deleted: true
      });

      if (!functionObj) {
        next(new ErrorResponse('Function not found or not deleted', 404));
        return;
      }

      // Restore function
      functionObj.is_deleted = false;
      functionObj.deleted_at = undefined;
      await functionObj.save();

      // Invalidate cache
      await invalidateCacheByPattern('api:/functions*');
      await invalidateCacheByPattern(`api:/functions/${req.params.id}`);

      res.status(200).json({
        success: true,
        data: functionObj
      });
    } catch (error) {
      console.error('Error restoring function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to restore function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to restore function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get deleted functions (Admin only)
// @route   GET /api/functions/deleted
// @access  Private/Admin
export const getDeletedFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Invalidate cache to ensure fresh data
      await invalidateCacheByPattern('api:/functions/deleted*');
      
      // Build query for deleted functions
      const query = { is_deleted: true };
      
      console.log('Query for deleted functions:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await FunctionModel.countDocuments(query);
      console.log('Total deleted functions found:', total);

      // Add pagination if requested
      let functions;
      if (req.query.page || req.query.limit) {
        // Parse pagination parameters
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const startIndex = (page - 1) * limit;
        
        // Execute query with pagination
        functions = await FunctionModel.find(query)
          .sort({ deleted_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean(); // Use lean for performance
          
        console.log(`Found ${functions.length} deleted functions after pagination`);
        
        // Pagination result
        const pagination = {
          current: page,
          pages: Math.ceil(total / limit),
          total
        };
        
        res.status(200).json({
          success: true,
          count: functions.length,
          pagination,
          data: functions
        });
      } else {
        // No pagination, return all results
        functions = await FunctionModel.find(query)
          .sort({ deleted_at: -1 })
          .lean(); // Use lean for performance
        
        console.log(`Found ${functions.length} deleted functions total (no pagination)`);
        
        res.status(200).json({
          success: true,
          count: functions.length,
          data: functions
        });
      }
    } catch (error) {
      console.error('Error fetching deleted functions:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch deleted functions: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch deleted functions due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get functions by date range
// @route   GET /api/functions/date-range
// @access  Private
export const getFunctionsByDateRange = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        next(new ErrorResponse('Please provide start and end dates', 400));
        return;
      }

      // Build query
      const query: any = { 
        is_deleted: false,
        function_start_date: { 
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };

      console.log('Query for date range:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await FunctionModel.countDocuments(query);
      console.log('Total functions in date range:', total);

      // Add pagination if requested
      let functions;
      if (req.query.page || req.query.limit) {
        // Parse pagination parameters
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const startIndex = (page - 1) * limit;
        
        // Execute query with pagination
        functions = await FunctionModel.find(query)
          .sort({ function_start_date: 1 })
          .skip(startIndex)
          .limit(limit)
          .lean(); // Use lean for performance
          
        console.log(`Found ${functions.length} functions in date range after pagination`);
        
        // Pagination result
        const pagination = {
          current: page,
          pages: Math.ceil(total / limit),
          total
        };
        
        res.status(200).json({
          success: true,
          count: functions.length,
          pagination,
          data: functions
        });
      } else {
        // No pagination, return all results
        functions = await FunctionModel.find(query)
          .sort({ function_start_date: 1 })
          .lean(); // Use lean for performance
        
        console.log(`Found ${functions.length} functions in date range (no pagination)`);
        
        res.status(200).json({
          success: true,
          count: functions.length,
          data: functions
        });
      }
    } catch (error) {
      console.error('Error fetching functions by date range:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch functions by date range: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch functions by date range due to an unknown error', 500));
      }
    }
  }
);

// @desc    Permanently delete function (Admin only)
// @route   DELETE /api/functions/:id/permanent
// @access  Private/Admin
export const permanentlyDeleteFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Find by function_id instead of _id
      const functionObj = await FunctionModel.findOne({
        function_id: req.params.id,
        is_deleted: true
      });

      if (!functionObj) {
        next(new ErrorResponse('Function not found or is not soft-deleted', 404));
        return;
      }

      // Save the function_id for cache invalidation
      const functionId = functionObj.function_id;

      // Permanent delete using MongoDB _id
      await FunctionModel.findByIdAndDelete(functionObj._id);

      // Invalidate cache
      await invalidateCacheByPattern('api:/functions*');
      await invalidateCacheByPattern(`api:/functions/${functionId}`);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Function permanently deleted'
      });
    } catch (error) {
      console.error('Error permanently deleting function:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to permanently delete function: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to permanently delete function due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get denomination summary for a function
// @route   GET /api/functions/:functionId/denominations
// @access  Private
export const getFunctionDenominations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function and Payer models
      const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');
      
      const functionId = req.params.functionId;
      
      console.log(`Generating denomination summary for function: ${functionId}`);
      
      // Get all payers for this function that are not deleted and involve cash
      const payers = await PayerModel.find({ 
        function_id: functionId,
        payer_given_object: 'Cash',
        is_deleted: false 
      }).lean();
      
      console.log(`Found ${payers.length} cash payers for function ID: ${functionId}`);
      
      // Initialize denomination counters
      const denominations_in_hand: Record<string, number> = {
        "2000": 0, 
        "500": 0, 
        "200": 0, 
        "100": 0, 
        "50": 0, 
        "20": 0, 
        "10": 0, 
        "5": 0, 
        "2": 0, 
        "1": 0
      };
      
      let total_received = 0;
      let total_returned = 0;
      
      // Calculate totals
      payers.forEach(payer => {
        // Add received denominations
        if (payer.denominations_received) {
          Object.keys(denominations_in_hand).forEach(denom => {
            // Type assertion to tell TypeScript that this is a valid key
            const recValue = (payer.denominations_received as Record<string, number>)[denom] || 0;
            denominations_in_hand[denom] += recValue;
            total_received += recValue * parseInt(denom);
          });
        }
        
        // Subtract returned denominations
        if (payer.denominations_returned) {
          Object.keys(denominations_in_hand).forEach(denom => {
            // Type assertion to tell TypeScript that this is a valid key
            const retValue = (payer.denominations_returned as Record<string, number>)[denom] || 0;
            denominations_in_hand[denom] -= retValue;
            total_returned += retValue * parseInt(denom);
          });
        }
      });
      
      // Calculate total in hand
      const total_in_hand = Object.keys(denominations_in_hand).reduce((sum, denom) => {
        return sum + (denominations_in_hand[denom] * parseInt(denom));
      }, 0);
      
      // Clean up the response by removing denominations with zero count
      const cleanedDenominations: Record<string, number> = { ...denominations_in_hand };
      Object.keys(cleanedDenominations).forEach(key => {
        if (cleanedDenominations[key] === 0) {
          delete cleanedDenominations[key];
        }
      });
      
      res.status(200).json({
        success: true,
        data: {
          denominations_in_hand: cleanedDenominations,
          total_in_hand,
          total_received,
          total_returned,
          cash_out_pay: 0, // Default value, can be updated in future
          special_handler_pay: 0, // Default value, can be updated in future
          total_final_amount: total_in_hand, // Same as total_in_hand by default
          computer_total: total_in_hand, // Same as total_in_hand by default
          difference: 0 // Default value
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating denomination summary:', error);
      next(new ErrorResponse('Failed to generate denomination summary', 500));
    }
  }
);

// @desc    Search functions by specific field with enhanced partial matching
// @route   GET /api/functions/search
// @access  Private
export const searchFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      // Extract query parameters with type assertions
      const searchParam = req.query.searchParam as string;
      const searchQuery = req.query.searchQuery as string;
      const page = (req.query.page as string) || '1';
      const limit = (req.query.limit as string) || '10';
      const sortBy = (req.query.sortBy as string) || 'created_at';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const searchType = (req.query.searchType as 'partial' | 'exact' | 'fuzzy' | 'startsWith' | 'endsWith') || 'partial';

      // Validate required parameters
      if (!searchParam || !searchQuery) {
        next(new ErrorResponse('Both searchParam and searchQuery are required', 400));
        return;
      }

      // Validate searchParam is allowed
      if (!FUNCTION_SEARCHABLE_FIELDS.includes(searchParam)) {
        next(new ErrorResponse(`Invalid searchParam. Allowed fields: ${FUNCTION_SEARCHABLE_FIELDS.join(', ')}`, 400));
        return;
      }

      // Parse pagination
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      let searchCondition: any = {};
      
      // Escape special regex characters
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      switch (searchParam) {
        case 'function_amt_spent':
          // For numeric fields, support range search
          const amount = parseFloat(searchQuery);
          if (isNaN(amount)) {
            next(new ErrorResponse('Invalid amount value', 400));
            return;
          }
          // Search within 10% range
          searchCondition[searchParam] = {
            $gte: amount * 0.9,
            $lte: amount * 1.1
          };
          break;
          
        case 'function_start_date':
          // For date fields, search for exact date or date range
          const searchDate = new Date(searchQuery);
          if (isNaN(searchDate.getTime())) {
            next(new ErrorResponse('Invalid date format', 400));
            return;
          }
          const nextDay = new Date(searchDate);
          nextDay.setDate(nextDay.getDate() + 1);
          searchCondition[searchParam] = {
            $gte: searchDate,
            $lt: nextDay
          };
          break;
          
        case 'function_owner_phno':
          // For phone numbers, default to startsWith
          if (searchType === 'exact') {
            searchCondition[searchParam] = searchQuery;
          } else {
            searchCondition[searchParam] = {
              $regex: `^${escapeRegex(searchQuery)}`
            };
          }
          break;
          
        default:
          // For string fields, apply different search types
          switch (searchType) {
            case 'exact':
              searchCondition[searchParam] = searchQuery;
              break;
              
            case 'startsWith':
              searchCondition[searchParam] = {
                $regex: `^${escapeRegex(searchQuery)}`,
                $options: 'i'
              };
              break;
              
            case 'endsWith':
              searchCondition[searchParam] = {
                $regex: `${escapeRegex(searchQuery)}$`,
                $options: 'i'
              };
              break;
              
            case 'fuzzy':
              // Create a fuzzy search pattern by allowing characters between each letter
              const fuzzyPattern = searchQuery.split('').map(char => escapeRegex(char)).join('.*');
              searchCondition[searchParam] = {
                $regex: fuzzyPattern,
                $options: 'i'
              };
              break;
              
            case 'partial':
            default:
              // Default partial search - contains anywhere
              searchCondition[searchParam] = {
                $regex: escapeRegex(searchQuery),
                $options: 'i'
              };
              break;
          }
      }

      // Add is_deleted filter
      const query = {
        ...searchCondition,
        is_deleted: false
      };

      // Build sort object
      const sortObject: any = {};
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute search with count in parallel
      const [functions, totalCount] = await Promise.all([
        FunctionModel.find(query)
          .sort(sortObject)
          .limit(limitNum)
          .skip(skip)
          .lean()
          .exec(),
        FunctionModel.countDocuments(query)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      // Prepare response
      const response = {
        success: true,
        data: functions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null
        },
        search: {
          field: searchParam,
          query: searchQuery,
          type: searchType,
          resultCount: functions.length
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Search error:', error);
      next(new ErrorResponse('Error performing search', 500));
    }
  }
);

// @desc    Bulk soft delete functions (Admin only)
// @route   POST /api/functions/bulk-delete
// @access  Private/Admin
export const bulkDeleteFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      const { function_ids } = req.body;
      
      // Validate input
      if (!function_ids || !Array.isArray(function_ids) || function_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of function_ids', 400));
        return;
      }

      // Find all functions that are not already deleted
      const functionsToDelete = await FunctionModel.find({
        function_id: { $in: function_ids },
        is_deleted: false
      });

      if (functionsToDelete.length === 0) {
        next(new ErrorResponse('No valid functions found to delete', 404));
        return;
      }

      // Prepare bulk update operations
      const bulkOps = functionsToDelete.map(func => ({
        updateOne: {
          filter: { _id: func._id },
          update: {
            $set: {
              is_deleted: true,
              deleted_at: new Date()
            }
          }
        }
      }));

      // Execute bulk update
      const result = await FunctionModel.bulkWrite(bulkOps);

      // Get the list of successfully deleted function_ids
      const deletedFunctionIds = functionsToDelete.map(func => func.function_id);
      const notFoundIds = function_ids.filter(id => !deletedFunctionIds.includes(id));

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/functions*');
      for (const functionId of deletedFunctionIds) {
        await invalidateCacheByPattern(`api:/functions/${functionId}`);
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: deletedFunctionIds,
          notFound: notFoundIds,
          deletedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      next(new ErrorResponse('Failed to bulk delete functions', 500));
    }
  }
);

// @desc    Bulk restore deleted functions (Admin only)
// @route   POST /api/functions/bulk-restore
// @access  Private/Admin
export const bulkRestoreFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function model
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      
      const { function_ids } = req.body;
      
      // Validate input
      if (!function_ids || !Array.isArray(function_ids) || function_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of function_ids', 400));
        return;
      }

      // Find all functions that are deleted
      const functionsToRestore = await FunctionModel.find({
        function_id: { $in: function_ids },
        is_deleted: true
      });

      if (functionsToRestore.length === 0) {
        next(new ErrorResponse('No deleted functions found to restore', 404));
        return;
      }

      // Prepare bulk update operations
      const bulkOps = functionsToRestore.map(func => ({
        updateOne: {
          filter: { _id: func._id },
          update: {
            $set: {
              is_deleted: false
            },
            $unset: {
              deleted_at: ""
            }
          }
        }
      }));

      // Execute bulk update
      const result = await FunctionModel.bulkWrite(bulkOps);

      // Get the list of successfully restored function_ids
      const restoredFunctionIds = functionsToRestore.map(func => func.function_id);
      const notFoundIds = function_ids.filter(id => !restoredFunctionIds.includes(id));

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/functions*');
      for (const functionId of restoredFunctionIds) {
        await invalidateCacheByPattern(`api:/functions/${functionId}`);
      }

      res.status(200).json({
        success: true,
        data: {
          restored: restoredFunctionIds,
          notFound: notFoundIds,
          restoredCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Error in bulk restore:', error);
      next(new ErrorResponse('Failed to bulk restore functions', 500));
    }
  }
);

// @desc    Bulk permanently delete functions (Admin only)
// @route   POST /api/functions/bulk-permanent-delete
// @access  Private/Admin
export const bulkPermanentlyDeleteFunctions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel<FunctionDocument>(orgName, 'functions');
      const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');
      
      const { function_ids } = req.body;
      
      // Validate input
      if (!function_ids || !Array.isArray(function_ids) || function_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of function_ids', 400));
        return;
      }

      // Find all functions that are soft-deleted
      const functionsToDelete = await FunctionModel.find({
        function_id: { $in: function_ids },
        is_deleted: true
      });

      if (functionsToDelete.length === 0) {
        next(new ErrorResponse('No soft-deleted functions found to permanently delete', 404));
        return;
      }

      // Get the MongoDB _ids and function_ids for deletion
      const mongoIds = functionsToDelete.map(func => func._id);
      const deletedFunctionIds = functionsToDelete.map(func => func.function_id);
      const notFoundIds = function_ids.filter(id => !deletedFunctionIds.includes(id));

      // Permanently delete the functions
      const result = await FunctionModel.deleteMany({
        _id: { $in: mongoIds }
      });

      // Also delete associated payers if needed (optional - depends on business logic)
      // await PayerModel.deleteMany({ function_id: { $in: deletedFunctionIds } });

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/functions*');
      for (const functionId of deletedFunctionIds) {
        await invalidateCacheByPattern(`api:/functions/${functionId}`);
      }

      res.status(200).json({
        success: true,
        data: {
          permanentlyDeleted: deletedFunctionIds,
          notFoundOrNotSoftDeleted: notFoundIds,
          deletedCount: result.deletedCount
        },
        message: 'Functions permanently deleted'
      });
    } catch (error) {
      console.error('Error in bulk permanent delete:', error);
      next(new ErrorResponse('Failed to bulk permanently delete functions', 500));
    }
  }
);

// @desc    Get payment methods summary for a function (excluding denomination cash)
// @route   GET /api/functions/:functionId/payment-methods
// @access  Private
export const getFunctionPaymentMethods = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('User not authenticated', 401));
        return;
      }

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }
      
      // Get the organization-specific Payer model
      const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');
      
      const functionId = req.params.functionId;
      
      console.log(`Generating payment methods summary for function: ${functionId}`);
      
      // First, get all payers to check for denominations
      const allPayers = await PayerModel.find({
        function_id: functionId,
        is_deleted: false
      }).lean();
      
      console.log(`Found ${allPayers.length} total payers for function ID: ${functionId}`);
      
      // Helper function to check if denominations have meaningful values
      const hasMeaningfulDenominations = (denominations: any): boolean => {
        if (!denominations || typeof denominations !== 'object') {
          return false;
        }
        
        // Check if any denomination has a value greater than 0
        return Object.values(denominations).some((value: any) => {
          const numValue = parseFloat(value?.toString() || '0');
          return numValue > 0;
        });
      };
      
      // Helper function to check if this is a genuine denomination-based payment
      const isGenuineDenominationPayment = (payer: any): boolean => {
        // First check: Does it have non-zero values in the denomination objects themselves?
        const hasReceivedDenoms = hasMeaningfulDenominations(payer.denominations_received);
        const hasReturnedDenoms = hasMeaningfulDenominations(payer.denominations_returned);
        
        // If there are actual denomination values, it's definitely a denomination payment
        if (hasReceivedDenoms || hasReturnedDenoms) {
          return true;
        }
        
        // Second check: Look for signs of denomination tracking usage
        // If we have total_received but no actual denomination breakdown, 
        // and total_received equals payer_amount, it might be a regular payment
        const totalReceived = parseFloat(payer.total_received?.toString() || '0');
        const totalReturned = parseFloat(payer.total_returned?.toString() || '0');
        const payerAmount = parseFloat(payer.payer_amount?.toString() || '0');
        
        // If total_received > 0 AND it doesn't equal payer_amount, it's likely denomination-based
        if (totalReceived > 0 && totalReceived !== payerAmount) {
          return true;
        }
        
        // If total_returned > 0, it's definitely denomination-based (change given)
        if (totalReturned > 0) {
          return true;
        }
        
        // EDGE CASE FIX: If total_received equals payer_amount and total_returned is 0,
        // and no actual denomination values, treat as regular payment
        // This handles cases where denomination structure exists but wasn't actually used
        if (totalReceived === payerAmount && totalReturned === 0 && !hasReceivedDenoms && !hasReturnedDenoms) {
          return false; // Not a genuine denomination payment
        }
        
        // If we have any denomination-related totals, assume it's denomination-based
        return totalReceived > 0 || totalReturned > 0;
      };
      
      // Filter out cash payments that are genuine denomination-based payments
      const filteredPayers = allPayers.filter(payer => {
        // First check if this is a Cash object (not gift or other item)
        if (payer.payer_given_object === 'Cash') {
          // If it's a Cash payment, check if it has denominations based on payer_cash_method
          if (payer.payer_cash_method === 'Cash') {
            const isGenuineDenomPayment = isGenuineDenominationPayment(payer);
            
            console.log(`Payer ${payer.payer_name}: amount=${payer.payer_amount}, total_received=${payer.total_received}, total_returned=${payer.total_returned}, isGenuineDenomPayment=${isGenuineDenomPayment}`);
            
            // CRITICAL FIX: Include only Cash payments that are NOT genuine denomination payments
            if (isGenuineDenomPayment) {
              console.log(`Excluding ${payer.payer_name} - genuine denomination payment`);
              return false; // EXCLUDE - this payment uses denomination tracking
            } else {
              console.log(`Including ${payer.payer_name} - regular cash payment (denomination structure exists but not used meaningfully)`);
              return true;  // INCLUDE - this is a regular payment method entry
            }
          }
          // Include all other cash methods (Google Pay, PhonePe, etc.)
          console.log(`Including ${payer.payer_name} - non-Cash method: ${payer.payer_cash_method}`);
          return true;
        }
        // Exclude non-Cash objects (gifts, etc.)
        console.log(`Excluding ${payer.payer_name} - not a Cash object: ${payer.payer_given_object}`);
        return false;
      });
      
      console.log(`Filtered to ${filteredPayers.length} cash payers (excluding those with meaningful denominations)`);
      
      // Initialize payment methods object
      const paymentMethods: Record<string, number> = {
        'Cash': 0,
        'Google Pay': 0,
        'PhonePe': 0,
        'Paytm': 0,
        'Bank Transfer': 0,
        'Other': 0
      };
      
      // Calculate totals for each payment method
      let totalAmount = 0;
      let totalCount = 0;
      
      filteredPayers.forEach(payer => {
        const amount = parseFloat(payer.payer_amount?.toString() || '0');
        let method = payer.payer_cash_method;
        
        // Handle null or empty payment methods - move to 'Other'
        if (!method || method === '') {
          method = 'Other';
        }
        
        // Normalize payment method names
        if (method === 'GPay') {
          method = 'Google Pay';
        }
        
        // Add to appropriate category
        if (paymentMethods.hasOwnProperty(method)) {
          paymentMethods[method] += amount;
        } else {
          // Any unknown payment method goes to Other
          paymentMethods['Other'] += amount;
        }
        
        totalAmount += amount;
        totalCount++;
        
        console.log(`Added payer ${payer.payer_name}: method=${method}, amount=${amount}`);
      });
      
      // Clean the response - only include payment methods with amount > 0
      const cleanedPaymentMethods: Record<string, number> = {};
      Object.entries(paymentMethods).forEach(([method, amount]) => {
        if (amount > 0) {
          cleanedPaymentMethods[method] = amount;
        }
      });
      
      // Prepare a more detailed summary
      const methodCounts: Record<string, number> = {};
      filteredPayers.forEach(payer => {
        // Only process Cash objects
        if (payer.payer_given_object === 'Cash') {
          let method = payer.payer_cash_method;
          
          // Handle null or empty payment methods
          if (!method || method === '') {
            method = 'Other';
          }
          
          // Normalize payment method names
          if (method === 'GPay') {
            method = 'Google Pay';
          }
          
          // Count occurrences of each method
          if (methodCounts.hasOwnProperty(method)) {
            methodCounts[method]++;
          } else if (paymentMethods.hasOwnProperty(method)) {
            methodCounts[method] = 1;
          } else {
            methodCounts['Other'] = (methodCounts['Other'] || 0) + 1;
          }
        }
      });
      
      // Create a detailed summary with count and amount for each method
      const detailedSummary = Object.entries(cleanedPaymentMethods).map(([method, amount]) => ({
        payment_method: method,
        count: methodCounts[method] || 0,
        total_amount: amount
      }));
      
      console.log(`Final summary: ${detailedSummary.length} payment methods, total amount: ${totalAmount}`);
      
      res.status(200).json({
        success: true,
        data: detailedSummary,
        summary: {
          total_amount: totalAmount,
          total_count: totalCount,
          methods_count: Object.keys(cleanedPaymentMethods).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating payment methods summary:', error);
      next(new ErrorResponse('Failed to generate payment methods summary', 500));
    }
  }
);