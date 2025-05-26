import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import EditLog from '../models/EditLog.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';

// @desc    Create a new edit log
// @route   POST /api/edit-logs
// @access  Private
export const createEditLog = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logData = req.body;
      
      // Add the current user as the creator
      logData.created_by = req.user?._id;
      
      // Create edit log
      const editLog = await EditLog.create(logData);

      // Invalidate any relevant cache
      await invalidateCacheByPattern('api:/edit-logs*');

      res.status(201).json({
        success: true,
        data: editLog
      });
    } catch (error) {
      console.error('Error creating edit log:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to create edit log: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to create edit log due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get all edit logs with pagination and filtering
// @route   GET /api/edit-logs
// @access  Private (Admin only)
export const getEditLogs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        next(new ErrorResponse('Not authorized as an admin', 403));
        return;
      }

      // Invalidate cache to ensure fresh data
      await invalidateCacheByPattern('api:/edit-logs*');

      // Extract query parameters for filtering
      const {
        target_id,
        target_type,
        action,
        created_by,
        user_email,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;

      // Build query
      const query: any = {};

      if (target_id) query.target_id = target_id;
      if (target_type) query.target_type = target_type;
      if (action) query.action = action;
      if (created_by) query.created_by = created_by;
      if (user_email) query.user_email = user_email;

      // Date range filter
      if (startDate || endDate) {
        query.created_at = {};
        if (startDate) query.created_at.$gte = new Date(startDate as string);
        if (endDate) query.created_at.$lte = new Date(endDate as string);
      }

      console.log('Query for edit logs:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await EditLog.countDocuments(query);
      console.log('Total edit logs found:', total);

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const startIndex = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const editLogs = await EditLog.find(query)
        .sort({ created_at: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .populate({
          path: 'created_by',
          select: 'username email'
        })
        .lean(); // Use lean for performance

      console.log(`Found ${editLogs.length} edit logs after pagination`);

      // Pagination result
      const pagination = {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      };

      res.status(200).json({
        success: true,
        count: editLogs.length,
        pagination,
        data: editLogs
      });
    } catch (error) {
      console.error('Error fetching edit logs:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch edit logs: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch edit logs due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get edit logs for a specific item (Function or Payer)
// @route   GET /api/edit-logs/:targetType/:targetId
// @access  Private
export const getEditLogsByTarget = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetType, targetId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Validate target type
      if (!['Function', 'Payer'].includes(targetType)) {
        next(new ErrorResponse(`Invalid target type: ${targetType}`, 400));
        return;
      }

      // Invalidate cache to ensure fresh data
      await invalidateCacheByPattern(`api:/edit-logs/${targetType}/${targetId}*`);

      // Build query
      const query = {
        target_id: targetId,
        target_type: targetType
      };

      console.log('Query for target edit logs:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await EditLog.countDocuments(query);
      console.log(`Total edit logs for ${targetType} ${targetId}:`, total);

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const startIndex = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const editLogs = await EditLog.find(query)
        .sort({ created_at: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .populate({
          path: 'created_by',
          select: 'username email'
        })
        .lean(); // Use lean for performance

      console.log(`Found ${editLogs.length} target edit logs after pagination`);

      // Pagination result
      const pagination = {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      };

      res.status(200).json({
        success: true,
        count: editLogs.length,
        pagination,
        data: editLogs
      });
    } catch (error) {
      console.error('Error fetching target edit logs:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch target edit logs: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch target edit logs due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get edit logs by user
// @route   GET /api/edit-logs/user/:userId
// @access  Private (Admin only)
export const getEditLogsByUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        next(new ErrorResponse('Not authorized as an admin', 403));
        return;
      }

      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Invalidate cache to ensure fresh data
      await invalidateCacheByPattern(`api:/edit-logs/user/${userId}*`);

      // Build query
      const query = {
        created_by: userId
      };

      console.log('Query for user edit logs:', JSON.stringify(query));

      // Get total count BEFORE pagination
      const total = await EditLog.countDocuments(query);
      console.log(`Total edit logs for user ${userId}:`, total);

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const startIndex = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const editLogs = await EditLog.find(query)
        .sort({ created_at: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .lean(); // Use lean for performance

      console.log(`Found ${editLogs.length} user edit logs after pagination`);

      // Pagination result
      const pagination = {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      };

      res.status(200).json({
        success: true,
        count: editLogs.length,
        pagination,
        data: editLogs
      });
    } catch (error) {
      console.error('Error fetching user edit logs:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch user edit logs: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch user edit logs due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get a specific edit log by ID
// @route   GET /api/edit-logs/:id
// @access  Private (Admin only)
export const getEditLogById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        next(new ErrorResponse('Not authorized as an admin', 403));
        return;
      }

      const editLog = await EditLog.findById(req.params.id)
        .populate({
          path: 'created_by',
          select: 'username email'
        })
        .lean();

      if (!editLog) {
        next(new ErrorResponse(`Edit log not found with id of ${req.params.id}`, 404));
        return;
      }

      res.status(200).json({
        success: true,
        data: editLog
      });
    } catch (error) {
      console.error('Error fetching edit log by id:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch edit log: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch edit log due to an unknown error', 500));
      }
    }
  }
);