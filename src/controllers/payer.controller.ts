import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest, FunctionDocument, PayerDocument } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import { findChangedFields, sanitizeForEditLog } from '../utils/editLogHelpers';
import { PAYER_SEARCHABLE_FIELDS } from '../utils/constants';
import { getOrganizationModel } from '../utils/dynamicCollections';

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

    // Get organization info from the authenticated user
    const orgName = req.user.org_name;
    const orgId = req.user.org_id;
    
    if (!orgName || !orgId) {
      next(new ErrorResponse('User organization information is missing', 400));
      return;
    }

    // Get the organization-specific Payer and Function models
    const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');
    const FunctionModel = getOrganizationModel<FunctionDocument>(orgName, 'functions');
    
    // Check if the function_id exists in this organization
    if (!req.body.function_id) {
      next(new ErrorResponse('Function ID is required', 400));
      return;
    }
    
    // Verify the function exists in this organization
    const functionExists = await FunctionModel.findOne({
      function_id: req.body.function_id,
      is_deleted: false
    });
    
    if (!functionExists) {
      next(new ErrorResponse('Function not found in this organization', 404));
      return;
    }

    // CHANGED: Add user email and name instead of ObjectId
    req.body.created_by = req.user.email;
    req.body.created_by_name = req.user.username;
    req.body.org_id = orgId;
    req.body.org_name = orgName;

    // Check if payer with the same phone number already exists IN THE SAME FUNCTION
    if (req.body.payer_phno && req.body.payer_phno.trim() !== '') {
      const existingPayer = await PayerModel.findOne({
        payer_phno: req.body.payer_phno,
        function_id: req.body.function_id,
        is_deleted: false // Only consider non-deleted payers
      });

      if (existingPayer) {
        next(new ErrorResponse('Payer with this phone number already exists in this function', 400));
        return;
      }
    }

    // Handle denomination calculations for cash payments
    if (req.body.payer_given_object === 'Cash') {
      // Check if denominations are provided
      const hasDenominations = req.body.denominations_received || req.body.denominations_returned;

      if (hasDenominations) {
        try {
          // Calculate total received
          const denomsReceived = req.body.denominations_received || {};
          const totalReceived =
            (denomsReceived['2000'] || 0) * 2000 +
            (denomsReceived['500'] || 0) * 500 +
            (denomsReceived['200'] || 0) * 200 +
            (denomsReceived['100'] || 0) * 100 +
            (denomsReceived['50'] || 0) * 50 +
            (denomsReceived['20'] || 0) * 20 +
            (denomsReceived['10'] || 0) * 10 +
            (denomsReceived['5'] || 0) * 5 +
            (denomsReceived['2'] || 0) * 2 +
            (denomsReceived['1'] || 0) * 1;

          // Calculate total returned
          const denomsReturned = req.body.denominations_returned || {};
          const totalReturned =
            (denomsReturned['2000'] || 0) * 2000 +
            (denomsReturned['500'] || 0) * 500 +
            (denomsReturned['200'] || 0) * 200 +
            (denomsReturned['100'] || 0) * 100 +
            (denomsReturned['50'] || 0) * 50 +
            (denomsReturned['20'] || 0) * 20 +
            (denomsReturned['10'] || 0) * 10 +
            (denomsReturned['5'] || 0) * 5 +
            (denomsReturned['2'] || 0) * 2 +
            (denomsReturned['1'] || 0) * 1;

          // Set the calculated values
          req.body.total_received = totalReceived;
          req.body.total_returned = totalReturned;
          req.body.net_amount = totalReceived - totalReturned;

          // Validate that net_amount matches payer_amount if payer_amount is provided
          if (req.body.payer_amount !== undefined &&
            req.body.payer_amount !== null &&
            req.body.net_amount !== req.body.payer_amount) {
            next(new ErrorResponse('Net amount from denominations does not match payer amount', 400));
            return;
          }
        } catch (error) {
          console.error('Error calculating denomination totals:', error);
          next(new ErrorResponse('Error processing denomination data', 400));
          return;
        }
      } else {
        // If no denominations provided, use payer_amount directly
        if (req.body.payer_amount !== undefined && req.body.payer_amount !== null) {
          req.body.net_amount = req.body.payer_amount;
          req.body.total_received = req.body.payer_amount;
          req.body.total_returned = 0;
        }
      }
    }

    // Create payer in the organization-specific collection
    const payer = await PayerModel.create(req.body);

    // Invalidate cache
    await invalidateCacheByPattern('api:/payers*');
    await invalidateCacheByPattern(`api:/functions/${req.body.function_id}/payers*`);
    await invalidateCacheByPattern(`api:/functions/${req.body.function_id}/denominations*`);

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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
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
    const total = await PayerModel.countDocuments(query);
    console.log('Total matching documents:', total);

    // Add pagination if requested
    let payers;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;

      // Execute query with pagination
      payers = await PayerModel.find(query)
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
      payers = await PayerModel.find(query)
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
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
    
    const payer = await PayerModel.findOne({
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

      // Get organization info from the authenticated user
      const orgName = req.user.org_name;
      
      if (!orgName) {
        next(new ErrorResponse('User organization information is missing', 400));
        return;
      }

      // Get the organization-specific Payer and EditLog models
      const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');
      const EditLogModel = getOrganizationModel(orgName, 'edit_logs');

      // Extract reason_for_edit from request body
      const { reason_for_edit, ...requestData } = req.body;

      // Validate reason for edit
      if (!reason_for_edit) {
        next(new ErrorResponse('Reason for edit is required', 400));
        return;
      }

      // Log the incoming request data for debugging
      console.log('Update Payer Request:', {
        payerId: req.params.id,
        updateData: JSON.stringify(requestData)
      });

      // Find payer by MongoDB _id
      let payer = await PayerModel.findOne({
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

      // Create the update data object that we'll modify
      let updateData: Record<string, any> = { ...requestData };
      
      // Don't allow function_id to be modified
      if (updateData.function_id) {
        delete updateData.function_id;
      }

      // Handle denomination calculations for cash payments
      if (payer!.payer_given_object === 'Cash') {
        // Reset all denomination-related fields to ensure clean slate
        updateData.total_received = 0;
        updateData.total_returned = 0;
        updateData.net_amount = 0;

        // Check if denominations are actually provided with real values
        const hasReceivedDenoms = requestData.denominations_received &&
          typeof requestData.denominations_received === 'object';

        const hasReturnedDenoms = requestData.denominations_returned &&
          typeof requestData.denominations_returned === 'object';

        const hasDenominations = hasReceivedDenoms || hasReturnedDenoms;

        if (hasDenominations) {
          try {
            // Clean up received denominations - only keep values > 0
            if (hasReceivedDenoms) {
              const cleanedReceivedDenoms: Record<string, number> = {};
              const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
              
              // Calculate totalReceived while cleaning
              let totalReceived = 0;
              
              denominations.forEach(denom => {
                // Safely access denomination values with proper type checking
                const denomKey = denom.toString();
                let count = 0;
                
                if (requestData.denominations_received && 
                    requestData.denominations_received[denomKey] !== undefined) {
                  count = Number(requestData.denominations_received[denomKey]) || 0;
                }
                
                if (count > 0) {
                  cleanedReceivedDenoms[denomKey] = count;
                  totalReceived += denom * count;
                }
              });
              
              // Update the denomination objects with cleaned versions
              updateData.denominations_received = cleanedReceivedDenoms;
              updateData.total_received = totalReceived;
              
              // Log for debugging
              console.log('Cleaned received denominations:', {
                original: requestData.denominations_received,
                cleaned: cleanedReceivedDenoms,
                totalReceived
              });
            } else {
              // No received denominations provided, ensure empty object
              updateData.denominations_received = {};
            }

            // Clean up returned denominations - only keep values > 0
            if (hasReturnedDenoms) {
              const cleanedReturnedDenoms: Record<string, number> = {};
              const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
              
              // Calculate totalReturned while cleaning
              let totalReturned = 0;
              
              denominations.forEach(denom => {
                // Safely access denomination values with proper type checking
                const denomKey = denom.toString();
                let count = 0;
                
                if (requestData.denominations_returned && 
                    requestData.denominations_returned[denomKey] !== undefined) {
                  count = Number(requestData.denominations_returned[denomKey]) || 0;
                }
                
                if (count > 0) {
                  cleanedReturnedDenoms[denomKey] = count;
                  totalReturned += denom * count;
                }
              });
              
              // Update the denomination objects with cleaned versions
              updateData.denominations_returned = cleanedReturnedDenoms;
              updateData.total_returned = totalReturned;
              
              // Log for debugging
              console.log('Cleaned returned denominations:', {
                original: requestData.denominations_returned,
                cleaned: cleanedReturnedDenoms,
                totalReturned
              });
            } else {
              // No returned denominations provided, ensure empty object
              updateData.denominations_returned = {};
            }

            // Calculate net amount based on the cleaned denomination totals
            updateData.net_amount = updateData.total_received - updateData.total_returned;

            // CRITICAL: Set payer_amount to match net_amount to ensure consistency
            updateData.payer_amount = updateData.net_amount;

            // Log calculation results
            console.log('Final denomination calculations:', {
              totalReceived: updateData.total_received,
              totalReturned: updateData.total_returned,
              netAmount: updateData.net_amount,
              payerAmount: updateData.payer_amount
            });
          } catch (error) {
            console.error('Error processing denominations:', error);
            next(new ErrorResponse('Error processing denomination data', 400));
            return;
          }
        } else if (updateData.payer_amount !== undefined) {
          // If only payer_amount is being updated without denominations
          const numericAmount = Number(updateData.payer_amount);
          
          // Ensure all related fields are updated to match
          updateData.net_amount = numericAmount;
          updateData.total_received = numericAmount;
          updateData.total_returned = 0;
          
          // Clear any existing denominations
          updateData.denominations_received = {};
          updateData.denominations_returned = {};
          
          console.log('Updated with amount only:', {
            payerAmount: numericAmount
          });
        }
      }

      // Log the final data being sent to the database
      console.log('Final update data:', JSON.stringify(updateData, null, 2));

      // Update payer
      payer = await PayerModel.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      }).lean() as unknown as typeof payer;

      // Verify the update was successful
      if (!payer) {
        next(new ErrorResponse('Failed to update payer', 500));
        return;
      }

      // Calculate which fields were changed
      const changedFields = findChangedFields(beforeValue, sanitizeForEditLog(payer));

      // Create edit log in organization-specific collection
      await EditLogModel.create({
        target_id: payer._id,
        target_type: 'Payer',
        action: 'update',
        before_value: beforeValue,
        after_value: sanitizeForEditLog(payer),
        reason: reason_for_edit,
        changed_fields: changedFields,
        created_by: req.user._id,
        user_email: req.user.email,
        user_name: req.user.username,
        org_id: req.user.org_id,
        org_name: req.user.org_name
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
      await invalidateCacheByPattern(`api:/functions/${functionId}/denominations*`);
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

    // Get organization info from the authenticated user
    const orgName = req.user.org_name;
    
    if (!orgName) {
      next(new ErrorResponse('User organization information is missing', 400));
      return;
    }

    // Get the organization-specific Payer model
    const PayerModel = getOrganizationModel<PayerDocument>(orgName, 'payers');

    const payer = await PayerModel.findOne({
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
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
    const total = await PayerModel.countDocuments(query);
    console.log('Total deleted documents:', total);

    // Add pagination if requested
    let payers;
    if (req.query.page || req.query.limit) {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const startIndex = (page - 1) * limit;

      // Execute query with pagination
      payers = await PayerModel.find(query)
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
      payers = await PayerModel.find(query)
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
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
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

    const payer = await PayerModel.findOne({
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
    // Check if user exists
    if (!req.user) {
      next(new ErrorResponse('User not found', 401));
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

    // Find the payer and ensure it's already soft-deleted
    const payer = await PayerModel.findOne({
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
    await PayerModel.findByIdAndDelete(req.params.id);

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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      const total = await PayerModel.countDocuments(query);
      console.log('Total payers for function:', total);

      // Add pagination if requested
      let payers;
      if (req.query.page || req.query.limit) {
        // Parse pagination parameters
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const startIndex = (page - 1) * limit;

        // Execute query with pagination, ensuring we get fresh data with lean()
        payers = await PayerModel.find(query)
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
        payers = await PayerModel.find(query)
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      const payers = await PayerModel.find({
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      const phoneNumber = req.params.phoneNumber;

      // Check if phone number is provided
      if (!phoneNumber || phoneNumber.trim() === '') {
        next(new ErrorResponse('Phone number is required', 400));
        return;
      }

      console.log(`Searching for payer with phone number: ${phoneNumber}`);

      // Find payers with the given phone number that are not deleted
      const payers = await PayerModel.find({
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      console.log('Fetching unique payer names');

      // Get all unique payer names using MongoDB distinct operation
      const uniqueNames = await PayerModel.distinct('payer_name', { is_deleted: false });

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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      console.log('Fetching unique payer gifts');

      // Get all unique payer gift names, filtering out empty strings
      const uniqueGifts = await PayerModel.distinct('payer_gift_name', {
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      console.log('Fetching unique payer relations');

      // Get all unique payer relations
      const uniqueRelations = await PayerModel.distinct('payer_relation', { is_deleted: false });

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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      console.log('Fetching unique payer cities');

      // Get all unique payer cities
      const uniqueCities = await PayerModel.distinct('payer_city', { is_deleted: false });

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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      console.log('Fetching unique payer work types');

      // Get all unique payer work types
      const uniqueWorks = await PayerModel.distinct('payer_work', { is_deleted: false });

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

// @desc    Search payers by specific field with enhanced partial matching
// @route   GET /api/payers/search
// @route   GET /api/functions/:functionId/payers/search
// @access  Private
export const searchPayers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      // Extract function ID from params if it's a function-specific search
      const functionId = req.params.functionId;

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
      if (!PAYER_SEARCHABLE_FIELDS.includes(searchParam)) {
        next(new ErrorResponse(`Invalid searchParam. Allowed fields: ${PAYER_SEARCHABLE_FIELDS.join(', ')}`, 400));
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
        case 'payer_amount':
          // For numeric fields, support range search
          const amount = parseFloat(searchQuery);
          if (isNaN(amount)) {
            next(new ErrorResponse('Invalid amount value', 400));
            return;
          }
          // Search exact amount or within a small range
          if (searchType === 'exact') {
            searchCondition[searchParam] = amount;
          } else {
            // Search within 5% range for amounts
            searchCondition[searchParam] = {
              $gte: amount * 0.95,
              $lte: amount * 1.05
            };
          }
          break;

        case 'payer_phno':
          // For phone numbers, default to startsWith
          if (searchType === 'exact') {
            searchCondition[searchParam] = searchQuery;
          } else {
            searchCondition[searchParam] = {
              $regex: `^${escapeRegex(searchQuery)}`
            };
          }
          break;

        case 'payer_cash_method':
          // For payment methods, case-insensitive exact or partial match
          if (searchType === 'exact') {
            searchCondition[searchParam] = {
              $regex: `^${escapeRegex(searchQuery)}$`,
              $options: 'i'
            };
          } else {
            searchCondition[searchParam] = {
              $regex: escapeRegex(searchQuery),
              $options: 'i'
            };
          }
          break;

        default:
          // For string fields (payer_name, payer_work, payer_relation, payer_city, function_id)
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

      // Build the complete query
      const query: any = {
        ...searchCondition,
        is_deleted: false
      };

      // If searching within a specific function, add function_id to query
      if (functionId) {
        query.function_id = functionId;
      }

      // Build sort object
      const sortObject: any = {};
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute search with count in parallel
      const [payers, totalCount] = await Promise.all([
        PayerModel.find(query)
          .sort(sortObject)
          .limit(limitNum)
          .skip(skip)
          .lean()
          .exec(),
        PayerModel.countDocuments(query)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      // Prepare response
      const response = {
        success: true,
        data: payers,
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
          resultCount: payers.length,
          ...(functionId && { functionId }) // Include functionId if searching within a function
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Payer search error:', error);
      next(new ErrorResponse('Error performing payer search', 500));
    }
  }
);

// @desc    Bulk soft delete payers
// @route   POST /api/payers/bulk-delete
// @access  Private
export const bulkSoftDeletePayers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      // Extract payer IDs from request body
      const { payer_ids } = req.body;

      // Validate input
      if (!payer_ids || !Array.isArray(payer_ids) || payer_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of payer_ids', 400));
        return;
      }

      console.log(`Attempting to soft delete ${payer_ids.length} payers`);

      // Arrays to track results
      const deleted: string[] = [];
      const notFound: string[] = [];
      const functionIdsToInvalidate = new Set<string>();

      // Process each payer ID
      for (const payerId of payer_ids) {
        try {
          const payer = await PayerModel.findOne({
            _id: payerId,
            is_deleted: false
          });

          if (payer) {
            // Soft delete the payer
            payer.is_deleted = true;
            payer.deleted_at = new Date();
            await payer.save();

            deleted.push(payerId);
            functionIdsToInvalidate.add(payer.function_id);
            console.log(`Successfully soft deleted payer: ${payerId}`);
          } else {
            notFound.push(payerId);
            console.log(`Payer not found or already deleted: ${payerId}`);
          }
        } catch (error) {
          console.error(`Error processing payer ${payerId}:`, error);
          notFound.push(payerId);
        }
      }

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/payers*');
      for (const functionId of functionIdsToInvalidate) {
        await invalidateCacheByPattern(`api:/functions/${functionId}/payers*`);
        await invalidateCacheByPattern(`api:/functions/${functionId}/denominations*`);
      }

      console.log(`Bulk soft delete completed: ${deleted.length} deleted, ${notFound.length} not found`);

      res.status(200).json({
        success: true,
        data: {
          deleted,
          notFound,
          deletedCount: deleted.length
        }
      });
    } catch (error) {
      console.error('Bulk soft delete error:', error);
      next(new ErrorResponse('Error performing bulk soft delete', 500));
    }
  }
);

// @desc    Bulk restore soft-deleted payers
// @route   POST /api/payers/bulk-restore
// @access  Private
export const bulkRestorePayers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      // Extract payer IDs from request body
      const { payer_ids } = req.body;

      // Validate input
      if (!payer_ids || !Array.isArray(payer_ids) || payer_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of payer_ids', 400));
        return;
      }

      console.log(`Attempting to restore ${payer_ids.length} payers`);

      // Arrays to track results
      const restored: string[] = [];
      const notFound: string[] = [];
      const functionIdsToInvalidate = new Set<string>();

      // Process each payer ID
      for (const payerId of payer_ids) {
        try {
          const payer = await PayerModel.findOne({
            _id: payerId,
            is_deleted: true
          });

          if (payer) {
            // Restore the payer
            payer.is_deleted = false;
            payer.deleted_at = undefined;
            await payer.save();

            restored.push(payerId);
            functionIdsToInvalidate.add(payer.function_id);
            console.log(`Successfully restored payer: ${payerId}`);
          } else {
            notFound.push(payerId);
            console.log(`Payer not found or not deleted: ${payerId}`);
          }
        } catch (error) {
          console.error(`Error processing payer ${payerId}:`, error);
          notFound.push(payerId);
        }
      }

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/payers*');
      for (const functionId of functionIdsToInvalidate) {
        await invalidateCacheByPattern(`api:/functions/${functionId}/payers*`);
        await invalidateCacheByPattern(`api:/functions/${functionId}/denominations*`);
      }

      console.log(`Bulk restore completed: ${restored.length} restored, ${notFound.length} not found`);

      res.status(200).json({
        success: true,
        data: {
          restored,
          notFound,
          restoredCount: restored.length
        }
      });
    } catch (error) {
      console.error('Bulk restore error:', error);
      next(new ErrorResponse('Error performing bulk restore', 500));
    }
  }
);

// @desc    Bulk permanently delete soft-deleted payers
// @route   POST /api/payers/bulk-permanent-delete
// @access  Private (Admin only)
export const bulkPermanentlyDeletePayers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists and is admin
      if (!req.user) {
        next(new ErrorResponse('User not found', 401));
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
      
      // Extract payer IDs from request body
      const { payer_ids } = req.body;

      // Validate input
      if (!payer_ids || !Array.isArray(payer_ids) || payer_ids.length === 0) {
        next(new ErrorResponse('Please provide an array of payer_ids', 400));
        return;
      }

      console.log(`Attempting to permanently delete ${payer_ids.length} payers`);

      // Arrays to track results
      const permanentlyDeleted: string[] = [];
      const notFoundOrNotSoftDeleted: string[] = [];
      const functionIdsToInvalidate = new Set<string>();

      // First, verify all payers exist and are soft-deleted
      for (const payerId of payer_ids) {
        try {
          const payer = await PayerModel.findOne({
            _id: payerId,
            is_deleted: true
          });

          if (!payer) {
            notFoundOrNotSoftDeleted.push(payerId);
            console.log(`Payer not found or not soft-deleted: ${payerId}`);
          } else {
            // Store function ID for cache invalidation
            functionIdsToInvalidate.add(payer.function_id);
          }
        } catch (error) {
          console.error(`Error checking payer ${payerId}:`, error);
          notFoundOrNotSoftDeleted.push(payerId);
        }
      }

      // Only proceed with deletion if we have valid payers to delete
      if (payer_ids.length > notFoundOrNotSoftDeleted.length) {
        // Perform bulk deletion for valid soft-deleted payers
        const deleteResult = await PayerModel.deleteMany({
          _id: { $in: payer_ids },
          is_deleted: true
        });

        // Track successfully deleted payers
        const deletedCount = deleteResult.deletedCount || 0;

        // Determine which IDs were successfully deleted
        for (const payerId of payer_ids) {
          if (!notFoundOrNotSoftDeleted.includes(payerId)) {
            permanentlyDeleted.push(payerId);
          }
        }

        console.log(`Permanently deleted ${deletedCount} payers`);
      }

      // Invalidate cache for all affected functions
      await invalidateCacheByPattern('api:/payers*');
      for (const functionId of functionIdsToInvalidate) {
        await invalidateCacheByPattern(`api:/functions/${functionId}/payers*`);
        await invalidateCacheByPattern(`api:/functions/${functionId}/denominations*`);
      }

      console.log(`Bulk permanent delete completed: ${permanentlyDeleted.length} deleted, ${notFoundOrNotSoftDeleted.length} not found or not soft-deleted`);

      // Check if any payers were deleted
      if (permanentlyDeleted.length === 0) {
        next(new ErrorResponse('No soft-deleted payers found to permanently delete', 400));
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          permanentlyDeleted,
          notFoundOrNotSoftDeleted,
          deletedCount: permanentlyDeleted.length
        },
        message: 'Payers permanently deleted'
      });
    } catch (error) {
      console.error('Bulk permanent delete error:', error);
      next(new ErrorResponse('Error performing bulk permanent delete', 500));
    }
  }
);