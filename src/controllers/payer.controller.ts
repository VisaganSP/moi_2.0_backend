import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Payer from '../models/Payer.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import { findChangedFields, sanitizeForEditLog } from '../utils/editLogHelpers';
import EditLog from '../models/EditLog.model';

// @desc    Create a new payer
// @route   POST /api/payers
// @access  Private
export const createPayer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
      return;
    }
    
    // Add user id to request body
    req.body.created_by = req.user._id;

    // Check if payer with the same phone number already exists, but only if phone number is provided
    if (req.body.payer_phno && req.body.payer_phno.trim() !== '') {
      const existingPayer = await Payer.findOne({ payer_phno: req.body.payer_phno });
      if (existingPayer) {
        next(new ErrorResponse('Payer with this phone number already exists', 400));
        return;
      }
    }

    // Create payer
    const payer = await Payer.create(req.body);

    // Invalidate cache
    await invalidateCacheByPattern('api:/payers*');
    await invalidateCacheByPattern(`api:/functions/${req.body.function_id}/payers*`);

    res.status(201).json({
      success: true,
      data: payer
    });
  }
);

// @desc    Get all payers
// @route   GET /api/payers
// @access  Private
export const getPayers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Invalidate cache to ensure fresh data
    await invalidateCacheByPattern('api:/payers*');
    if (req.query.function_id) {
      await invalidateCacheByPattern(`api:/functions/${req.query.function_id}/payers*`);
    }
    
    // Build query - explicitly filter out deleted records
    const query: any = { is_deleted: false };
    
    // Filter by function_id if provided
    if (req.query.function_id) {
      query.function_id = req.query.function_id;
    }
    
    // Add search functionality
    if (req.query.search) {
      query.$or = [
        { payer_name: { $regex: req.query.search, $options: 'i' } },
        { payer_phno: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    console.log('Query:', JSON.stringify(query));

    // Get total count BEFORE pagination
    const total = await Payer.countDocuments(query);
    console.log('Total matching documents:', total);

    // Add pagination if requested
    let payers;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      // Execute query with pagination
      payers = await Payer.find(query)
        .sort({ created_at: -1 })
        .skip(startIndex)
        .limit(limit)
        .lean(); // Use lean for performance
        
      console.log(`Found ${payers.length} payers after pagination`);
      
      // Pagination result
      const pagination = {
        current: page,
        pages: Math.ceil(total / limit),
        total
      };
      
      res.status(200).json({
        success: true,
        count: payers.length,
        pagination,
        data: payers
      });
    } else {
      // No pagination, return all results
      payers = await Payer.find(query)
        .sort({ created_at: -1 })
        .lean(); // Use lean for performance
      
      console.log(`Found ${payers.length} payers total (no pagination)`);
      
      res.status(200).json({
        success: true,
        count: payers.length,
        data: payers
      });
    }
  }
);

// @desc    Get payer by ID
// @route   GET /api/payers/:id
// @access  Private
export const getPayerById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const payer = await Payer.findOne({
      _id: req.params.id,
      is_deleted: false
    });

    if (!payer) {
      next(new ErrorResponse('Payer not found', 404));
      return;
    }

    res.status(200).json({
      success: true,
      data: payer
    });
  }
);

// @desc    Update payer
// @route   PUT /api/payers/:id
// @access  Private
export const updatePayer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
        return;
      }

      // Extract reason_for_edit from request body
      const { reason_for_edit, ...updateData } = req.body;
      
      // Validate reason for edit
      if (!reason_for_edit) {
        next(new ErrorResponse('Reason for edit is required', 400));
        return;
      }

      // Find payer by MongoDB _id
      let payer = await Payer.findOne({
        _id: req.params.id,
        is_deleted: false
      });

      if (!payer) {
        next(new ErrorResponse('Payer not found', 404));
        return;
      }

      // Store the original state for edit log
      const beforeValue = sanitizeForEditLog(payer.toObject());

      // Store function_id for cache invalidation
      const functionId = payer.function_id;
      
      // Don't allow function_id to be modified
      if (updateData.function_id) {
        delete updateData.function_id;
      }

      // Update payer
      payer = await Payer.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      }).lean() as unknown as typeof payer;  // Use lean for better performance

      // Calculate which fields were changed
      const changedFields = findChangedFields(beforeValue, sanitizeForEditLog(payer));

      // Create edit log
      await EditLog.create({
        target_id: payer._id,
        target_type: 'Payer',
        action: 'update',
        before_value: beforeValue,
        after_value: sanitizeForEditLog(payer),
        reason: reason_for_edit,
        changed_fields: changedFields,
        created_by: req.user._id,
        user_email: req.user.email,
        user_name: req.user.username
      });

      // More aggressive cache invalidation with better logging
      console.log('Starting cache invalidation for updated payer...');
      
      // Clear all payer-related caches
      await invalidateCacheByPattern('api:/payers*');
      console.log('Invalidated general payers cache');
      
      // Clear specific payer cache (try both ObjectId and string formats)
      await invalidateCacheByPattern(`api:/payers/${req.params.id}`);
      await invalidateCacheByPattern(`api:/payers/${req.params.id.toString()}`);
      console.log(`Invalidated cache for payer ID: ${req.params.id}`);
      
      // Clear function-payer relationship caches
      await invalidateCacheByPattern(`api:/functions/${functionId}/payers*`);
      await invalidateCacheByPattern(`api:/functions/${functionId.toString()}/payers*`);
      console.log(`Invalidated cache for function-payers: ${functionId}`);
      
      // Clear edit logs cache
      await invalidateCacheByPattern('api:/edit-logs*');
      console.log('Invalidated edit logs cache');
      
      // Clear any specific cached routes that might contain this payer
      await invalidateCacheByPattern(`api:/payers/phone/*`);
      console.log('Invalidated phone-specific caches');
      
      // Force cache refresh by adding a timestamp to force a cache miss
      const timestamp = Date.now();
      await invalidateCacheByPattern(`api:/payers?_t=${timestamp}`);
      console.log('Added timestamp to force cache refresh');

      console.log(`Successfully updated payer with ID: ${req.params.id}`);

      res.status(200).json({
        success: true,
        data: payer,
        _cache_cleared: true // Flag to indicate cache was cleared
      });
    } catch (error) {
      console.error('Error updating payer:', error);
      if (error instanceof mongoose.Error.CastError) {
        next(new ErrorResponse('Invalid payer ID format', 400));
      } else if (error instanceof mongoose.Error.ValidationError) {
        next(new ErrorResponse(`Validation error: ${error.message}`, 400));
      } else {
        next(new ErrorResponse('Error updating payer', 500));
      }
    }
  }
);

// @desc    Delete payer (soft delete)
// @route   DELETE /api/payers/:id
// @access  Private
export const deletePayer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
      return;
    }

    const payer = await Payer.findOne({
      _id: req.params.id,
      is_deleted: false
    });

    if (!payer) {
      next(new ErrorResponse('Payer not found', 404));
      return;
    }

    // Soft delete
    payer.is_deleted = true;
    payer.deleted_at = new Date();
    await payer.save();

    // Invalidate cache
    await invalidateCacheByPattern('api:/payers*');
    await invalidateCacheByPattern(`api:/payers/${req.params.id}`);
    await invalidateCacheByPattern(`api:/functions/${payer.function_id}/payers*`);

    res.status(200).json({
      success: true,
      data: {}
    });
  }
);

// @desc    Get deleted payers
// @route   GET /api/payers/deleted
// @access  Private
export const getDeletedPayers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Build query for deleted payers
    const query: any = { is_deleted: true };
    
    // Filter by function_id if provided
    if (req.query.function_id) {
      query.function_id = req.query.function_id;
    }

    // Invalidate cache to ensure fresh data
    await invalidateCacheByPattern('api:/payers/deleted*');
    if (req.query.function_id) {
      await invalidateCacheByPattern(`api:/functions/${req.query.function_id}/payers*`);
    }

    console.log('Query for deleted payers:', JSON.stringify(query));

    // Get total count BEFORE pagination
    const total = await Payer.countDocuments(query);
    console.log('Total deleted documents:', total);

    // Add pagination if requested
    let payers;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      // Execute query with pagination
      payers = await Payer.find(query)
        .sort({ deleted_at: -1 })
        .skip(startIndex)
        .limit(limit)
        .lean(); // Use lean for performance
        
      console.log(`Found ${payers.length} deleted payers after pagination`);
      
      // Pagination result
      const pagination = {
        current: page,
        pages: Math.ceil(total / limit),
        total
      };
      
      res.status(200).json({
        success: true,
        count: payers.length,
        pagination,
        data: payers
      });
    } else {
      // No pagination, return all results
      payers = await Payer.find(query)
        .sort({ deleted_at: -1 })
        .lean(); // Use lean for performance
      
      console.log(`Found ${payers.length} deleted payers total (no pagination)`);
      
      res.status(200).json({
        success: true,
        count: payers.length,
        data: payers
      });
    }
  }
);

// @desc    Restore deleted payer
// @route   PUT /api/payers/:id/restore
// @access  Private
export const restorePayer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const payer = await Payer.findOne({
      _id: req.params.id,
      is_deleted: true
    });

    if (!payer) {
      next(new ErrorResponse('Payer not found or not deleted', 404));
      return;
    }

    // Restore payer
    payer.is_deleted = false;
    payer.deleted_at = undefined;
    await payer.save();

    // Invalidate cache
    await invalidateCacheByPattern('api:/payers*');
    await invalidateCacheByPattern(`api:/functions/${payer.function_id}/payers*`);

    res.status(200).json({
      success: true,
      data: payer
    });
  }
);

// @desc    Permanently delete payer
// @route   DELETE /api/payers/:id/permanent
// @access  Private
export const permanentlyDeletePayer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Find the payer and ensure it's already soft-deleted
    const payer = await Payer.findOne({
      _id: req.params.id,
      is_deleted: true
    });

    if (!payer) {
      next(new ErrorResponse('Payer not found or is not soft-deleted', 404));
      return;
    }

    // Save function_id before deletion for cache invalidation
    const functionId = payer.function_id;

    // Permanent delete
    await Payer.findByIdAndDelete(req.params.id);

    // Invalidate cache
    await invalidateCacheByPattern('api:/payers*');
    await invalidateCacheByPattern(`api:/functions/${functionId}/payers*`);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Payer permanently deleted'
    });
  }
);

// @desc    Get payers by function ID
// @route   GET /api/functions/:functionId/payers
// @access  Private
export const getPayersByFunction = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const functionId = req.params.functionId;
      
      // Force invalidate all related caches
      try {
        await Promise.all([
          invalidateCacheByPattern('api:/payers*'),
          invalidateCacheByPattern(`api:/functions/${functionId}/payers*`),
          invalidateCacheByPattern(`api:/functions/${functionId}*`),
          invalidateCacheByPattern('api:/*')  // Invalidate all API caches as a last resort
        ]);
        console.log('Cache invalidation completed');
      } catch (cacheError) {
        console.error('Cache invalidation error:', cacheError);
        // Continue execution even if cache invalidation fails
      }
      
      // Build query
      const query: { 
        function_id: string; 
        is_deleted: boolean;
        [key: string]: any; // This allows dynamic properties to be added and removed
      } = { 
        function_id: functionId,
        is_deleted: false
      };
      
      // Add a timestamp to the query for logging
      const timestamp = new Date().getTime();
      console.log(`Query timestamp: ${timestamp}`);
      
      console.log('Query for function payers:', JSON.stringify(query));

      // Get total count directly from database
      const total = await Payer.countDocuments(query);
      console.log('Total payers for function:', total);

      // Add pagination if requested
      let payers;
      if (req.query.page || req.query.limit) {
        // Parse pagination parameters
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const startIndex = (page - 1) * limit;
        
        // Execute query with pagination, ensuring we get fresh data with lean()
        payers = await Payer.find(query)
          .sort({ created_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();
          
        console.log(`Found ${payers.length} payers for function after pagination`);
        
        // List the IDs of found payers for debugging
        console.log('Payer IDs found:', payers.map(p => p._id).join(', '));
        
        // Pagination result
        const pagination = {
          current: page,
          pages: Math.ceil(total / limit),
          total
        };
        
        res.status(200).json({
          success: true,
          count: payers.length,
          pagination,
          data: payers,
          timestamp: new Date().toISOString() // Add timestamp to verify fresh response
        });
      } else {
        // No pagination, return all results
        payers = await Payer.find(query)
          .sort({ created_at: -1 })
          .lean();
        
        console.log(`Found ${payers.length} payers for function (no pagination)`);
        console.log('Payer IDs found:', payers.map(p => p._id).join(', '));
        
        res.status(200).json({
          success: true,
          count: payers.length,
          data: payers,
          timestamp: new Date().toISOString() // Add timestamp to verify fresh response
        });
      }
    } catch (error) {
      console.error('Error fetching payers by function:', error);
      next(new ErrorResponse('Error fetching payers', 500));
    }
  }
);

// @desc    Get total payment amount by function ID
// @route   GET /api/functions/:functionId/total-payment
// @access  Private
export const getTotalPaymentByFunction = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const functionId = req.params.functionId;
      
      // Force invalidate all related caches
      try {
        await Promise.all([
          invalidateCacheByPattern('api:/payers*'),
          invalidateCacheByPattern(`api:/functions/${functionId}/payers*`),
          invalidateCacheByPattern(`api:/functions/${functionId}*`),
          invalidateCacheByPattern('api:/*')
        ]);
        console.log('Cache invalidation completed');
      } catch (cacheError) {
        console.error('Cache invalidation error:', cacheError);
      }
      
      console.log('Computing total payment for function:', functionId);
      
      // Get all payers for this function with is_deleted: false
      const payers = await Payer.find({ 
        function_id: functionId,
        is_deleted: false 
      }).lean();
      
      console.log(`Found ${payers.length} payers for function ID: ${functionId}`);
      
      // Log each payer for debugging
      if (payers.length > 0) {
        payers.forEach((payer, index) => {
          console.log(`Payer ${index + 1}:`, {
            _id: payer._id,
            name: payer.payer_name,
            amount: payer.payer_amount,
            function_id: payer.function_id
          });
        });
      }
      
      // Calculate totals manually instead of using aggregation
      let totalAmount = 0;
      payers.forEach(payer => {
        // Ensure payer_amount is a number
        const amount = typeof payer.payer_amount === 'number' ? payer.payer_amount : 0;
        totalAmount += amount;
      });
      
      console.log('Calculated total amount:', totalAmount);
      console.log('Total payers count:', payers.length);

      // Return the results
      res.status(200).json({
        success: true,
        data: {
          totalAmount,
          count: payers.length,
          timestamp: new Date().toISOString() // Add timestamp for freshness verification
        },
        // Include debug info in development
        debug: process.env.NODE_ENV === 'development' ? {
          functionId,
          payerIds: payers.map(p => p._id),
          individualAmounts: payers.map(p => ({ id: p._id, amount: p.payer_amount }))
        } : undefined
      });
    } catch (error) {
      console.error('Error calculating total payment:', error);
      next(new ErrorResponse('Failed to calculate total payment amount', 500));
    }
  }
);

// @desc    Get payer by phone number
// @route   GET /api/payers/phone/:phoneNumber
// @access  Private
export const getPayerByPhoneNumber = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phoneNumber = req.params.phoneNumber;
      
      // Check if phone number is provided
      if (!phoneNumber || phoneNumber.trim() === '') {
        next(new ErrorResponse('Phone number is required', 400));
        return;
      }
      
      console.log(`Searching for payer with phone number: ${phoneNumber}`);
      
      // Find payers with the given phone number that are not deleted
      const payers = await Payer.find({
        payer_phno: phoneNumber,
        is_deleted: false
      }).lean();
      
      if (payers.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No payer found with this phone number'
        });
        return;
      }
      
      console.log(`Found ${payers.length} payer(s) with phone number: ${phoneNumber}`);
      
      // Return the payer(s) found
      res.status(200).json({
        success: true,
        count: payers.length,
        data: payers
      });
    } catch (error) {
      console.error('Error finding payer by phone number:', error);
      next(new ErrorResponse('Error finding payer', 500));
    }
  }
);

// @desc    Get all unique payer names
// @route   GET /api/payers/unique/names
// @access  Private
export const getUniquePayerNames = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Fetching unique payer names');
      
      // Get all unique payer names using MongoDB distinct operation
      const uniqueNames = await Payer.distinct('payer_name', { is_deleted: false });
      
      console.log(`Found ${uniqueNames.length} unique payer names`);
      
      res.status(200).json({
        success: true,
        count: uniqueNames.length,
        data: uniqueNames
      });
    } catch (error) {
      console.error('Error fetching unique payer names:', error);
      next(new ErrorResponse('Error fetching unique payer names', 500));
    }
  }
);

// @desc    Get all unique payer gifts
// @route   GET /api/payers/unique/gifts
// @access  Private
export const getUniquePayerGifts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Fetching unique payer gifts');
      
      // Get all unique payer gift names, filtering out empty strings
      const uniqueGifts = await Payer.distinct('payer_gift_name', { 
        is_deleted: false,
        payer_gift_name: { $ne: "" } // Filter out empty strings
      });
      
      console.log(`Found ${uniqueGifts.length} unique payer gifts`);
      
      res.status(200).json({
        success: true,
        count: uniqueGifts.length,
        data: uniqueGifts
      });
    } catch (error) {
      console.error('Error fetching unique payer gifts:', error);
      next(new ErrorResponse('Error fetching unique payer gifts', 500));
    }
  }
);

// @desc    Get all unique payer relations
// @route   GET /api/payers/unique/relations
// @access  Private
export const getUniquePayerRelations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Fetching unique payer relations');
      
      // Get all unique payer relations
      const uniqueRelations = await Payer.distinct('payer_relation', { is_deleted: false });
      
      console.log(`Found ${uniqueRelations.length} unique payer relations`);
      
      res.status(200).json({
        success: true,
        count: uniqueRelations.length,
        data: uniqueRelations
      });
    } catch (error) {
      console.error('Error fetching unique payer relations:', error);
      next(new ErrorResponse('Error fetching unique payer relations', 500));
    }
  }
);

// @desc    Get all unique payer cities
// @route   GET /api/payers/unique/cities
// @access  Private
export const getUniquePayerCities = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Fetching unique payer cities');
      
      // Get all unique payer cities
      const uniqueCities = await Payer.distinct('payer_city', { is_deleted: false });
      
      console.log(`Found ${uniqueCities.length} unique payer cities`);
      
      res.status(200).json({
        success: true,
        count: uniqueCities.length,
        data: uniqueCities
      });
    } catch (error) {
      console.error('Error fetching unique payer cities:', error);
      next(new ErrorResponse('Error fetching unique payer cities', 500));
    }
  }
);

// @desc    Get all unique payer work types
// @route   GET /api/payers/unique/works
// @access  Private
export const getUniquePayerWorks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Fetching unique payer work types');
      
      // Get all unique payer work types
      const uniqueWorks = await Payer.distinct('payer_work', { is_deleted: false });
      
      console.log(`Found ${uniqueWorks.length} unique payer work types`);
      
      res.status(200).json({
        success: true,
        count: uniqueWorks.length,
        data: uniqueWorks
      });
    } catch (error) {
      console.error('Error fetching unique payer work types:', error);
      next(new ErrorResponse('Error fetching unique payer work types', 500));
    }
  }
);