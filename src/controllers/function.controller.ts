import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Function from '../models/Function.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import { findChangedFields, sanitizeForEditLog } from '../utils/editLogHelpers';
import EditLog from '../models/Editlog.model';

// @desc    Create a new function (Admin only)
// @route   POST /api/functions
// @access  Private/Admin
export const createFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Add user id to request body
      req.body.created_by = req.user?._id;
      
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
      
      // Create function with the added function_id
      const functionObj = await Function.create(req.body);

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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Invalidate cache to ensure fresh data
    await invalidateCacheByPattern('api:/functions*');

    // Build query
    const query: any = { is_deleted: false };
    
    // Add search functionality
    if (req.query.search) {
      query.function_name = { $regex: req.query.search, $options: 'i' };
    }

    console.log('Query for functions:', JSON.stringify(query));

    // Get total count BEFORE pagination
    const total = await Function.countDocuments(query);
    console.log('Total functions found:', total);

    // Add pagination if requested
    let functions;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      // Execute query with pagination
      functions = await Function.find(query)
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
      functions = await Function.find(query)
        .sort({ created_at: -1 })
        .lean(); // Use lean for performance
      
      console.log(`Found ${functions.length} functions total (no pagination)`);
      
      res.status(200).json({
        success: true,
        count: functions.length,
        data: functions
      });
    }
  }
);

// @desc    Get function by ID
// @route   GET /api/functions/:id
// @access  Private
export const getFunctionById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Use function_id instead of _id
    const functionObj = await Function.findOne({
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
  }
);

// @desc    Update function (Admin only)
// @route   PUT /api/functions/:id
// @access  Private/Admin
export const updateFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Extract reason_for_edit from request body
    const { reason_for_edit, ...updateData } = req.body;
    
    // Validate reason for edit
    if (!reason_for_edit) {
      next(new ErrorResponse('Reason for edit is required', 400));
      return;
    }

    // Find by function_id instead of _id
    let functionObj = await Function.findOne({
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

    // Update function using its MongoDB _id
    functionObj = await Function.findByIdAndUpdate(functionObj._id, updateData, {
      new: true,
      runValidators: true
    });

    // Calculate which fields were changed
    const changedFields = findChangedFields(beforeValue, sanitizeForEditLog(functionObj!.toObject()));

    // Create edit log
    await EditLog.create({
      target_id: functionObj!._id,
      target_type: 'Function',
      action: 'update',
      before_value: beforeValue,
      after_value: sanitizeForEditLog(functionObj!.toObject()),
      reason: reason_for_edit,
      changed_fields: changedFields,
      created_by: req.user?._id,
      user_email: req.user?.email,
      user_name: req.user?.username
    });

    // Invalidate cache
    await invalidateCacheByPattern('api:/functions*');
    await invalidateCacheByPattern(`api:/functions/${req.params.id}`);
    await invalidateCacheByPattern('api:/edit-logs*');

    res.status(200).json({
      success: true,
      data: functionObj
    });
  }
);

// @desc    Delete function (soft delete) (Admin only)
// @route   DELETE /api/functions/:id
// @access  Private/Admin
export const deleteFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Find by function_id instead of _id
    const functionObj = await Function.findOne({
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
  }
);

// @desc    Restore deleted function (Admin only)
// @route   PUT /api/functions/:id/restore
// @access  Private/Admin
export const restoreFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Find by function_id instead of _id
    const functionObj = await Function.findOne({
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
  }
);

// @desc    Get deleted functions (Admin only)
// @route   GET /api/functions/deleted
// @access  Private/Admin
export const getDeletedFunctions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Invalidate cache to ensure fresh data
    await invalidateCacheByPattern('api:/functions/deleted*');
    
    // Build query for deleted functions
    const query = { is_deleted: true };
    
    console.log('Query for deleted functions:', JSON.stringify(query));

    // Get total count BEFORE pagination
    const total = await Function.countDocuments(query);
    console.log('Total deleted functions found:', total);

    // Add pagination if requested
    let functions;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      // Execute query with pagination
      functions = await Function.find(query)
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
      functions = await Function.find(query)
        .sort({ deleted_at: -1 })
        .lean(); // Use lean for performance
      
      console.log(`Found ${functions.length} deleted functions total (no pagination)`);
      
      res.status(200).json({
        success: true,
        count: functions.length,
        data: functions
      });
    }
  }
);

// @desc    Get functions by date range
// @route   GET /api/functions/date-range
// @access  Private
export const getFunctionsByDateRange = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    const total = await Function.countDocuments(query);
    console.log('Total functions in date range:', total);

    // Add pagination if requested
    let functions;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      // Execute query with pagination
      functions = await Function.find(query)
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
      functions = await Function.find(query)
        .sort({ function_start_date: 1 })
        .lean(); // Use lean for performance
      
      console.log(`Found ${functions.length} functions in date range (no pagination)`);
      
      res.status(200).json({
        success: true,
        count: functions.length,
        data: functions
      });
    }
  }
);

// @desc    Permanently delete function (Admin only)
// @route   DELETE /api/functions/:id/permanent
// @access  Private/Admin
export const permanentlyDeleteFunction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Find by function_id instead of _id
    const functionObj = await Function.findOne({
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
    await Function.findByIdAndDelete(functionObj._id);

    // Invalidate cache
    await invalidateCacheByPattern('api:/functions*');
    await invalidateCacheByPattern(`api:/functions/${functionId}`);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Function permanently deleted'
    });
  }
);