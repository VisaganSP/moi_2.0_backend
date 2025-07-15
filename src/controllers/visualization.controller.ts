import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';
import { invalidateCacheByPattern } from '../utils/cacheUtils';
import { getOrganizationModel } from '../utils/dynamicCollections';
import { redisClient } from '../config/redis';

// @desc    Get payers by cash method for a function
// @route   GET /api/functions/:functionId/payment-methods
// @access  Private
export const getPaymentMethodDistribution = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
      
      console.log(`Getting payment method distribution for function: ${functionId}`);
    
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
      
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        return next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
      }
      
      // Get all payers for this function
      const payers = await PayerModel.find({
        function_id: functionExists.function_id,
        is_deleted: { $ne: true },
        org_id: orgId
      }).lean();
      
      console.log(`Found ${payers.length} payers for function ID: ${functionId}`);
      
      // Process payers manually to handle null/empty values
      const methodsMap = new Map();
      
      payers.forEach(payer => {
        // Normalize the payment method - replace null/empty with "Other"
        let method = payer.payer_cash_method;
        if (!method || method === '') {
          method = 'Other';
        }
        
        // Initialize or update the entry
        if (!methodsMap.has(method)) {
          methodsMap.set(method, {
            payment_method: method,
            count: 1,
            total_amount: payer.payer_amount || 0
          });
        } else {
          const current = methodsMap.get(method);
          current.count += 1;
          current.total_amount += (payer.payer_amount || 0);
          methodsMap.set(method, current);
        }
      });
      
      // Convert map to array and sort by total_amount
      const paymentMethodDistribution = Array.from(methodsMap.values())
        .sort((a, b) => b.total_amount - a.total_amount);
      
      console.log(`Processed ${paymentMethodDistribution.length} distinct payment methods`);
      
      res.status(200).json({
        success: true,
        data: paymentMethodDistribution
      });
    } catch (error) {
      console.error('Error getting payment method distribution:', error);
      next(new ErrorResponse('Failed to get payment method distribution', 500));
    }
  }
);

// @desc    Get payment distribution by relation type for a function
// @route   GET /api/functions/:functionId/relation-distribution
// @access  Private
export const getRelationDistribution = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
    
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
    
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
        return;
      }
      
      // Cache key - include org name to avoid cache conflicts
      const cacheKey = `api:${orgName}:functions:${functionId}:relation-distribution`;
      
      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }
      
      // Aggregate payers by relation
      const relationDistribution = await PayerModel.aggregate([
        {
          $match: {
            function_id: functionExists.function_id,
            is_deleted: { $ne: true },
            org_id: orgId
          }
        },
        {
          $group: {
            _id: "$payer_relation",
            count: { $sum: 1 },
            total_amount: { $sum: "$payer_amount" }
          }
        },
        {
          $project: {
            _id: 0,
            relation: "$_id",
            count: 1,
            total_amount: 1,
            average_amount: { $round: [{ $divide: ["$total_amount", "$count"] }, 2] }
          }
        },
        {
          $sort: { total_amount: -1 }
        }
      ]);
      
      const response = {
        success: true,
        data: relationDistribution
      };
      
      // Set cache (5 minutes)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 300 // Expire in 300 seconds (5 minutes)
      });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting relation distribution:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get relation distribution: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get relation distribution due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get contribution summary by city for a function
// @route   GET /api/functions/:functionId/city-distribution
// @access  Private
export const getCityDistribution = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
    
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
    
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
        return;
      }
      
      // Cache key - include org name to avoid cache conflicts
      const cacheKey = `api:${orgName}:functions:${functionId}:city-distribution`;
      
      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }
      
      // Aggregate payers by city
      const cityDistribution = await PayerModel.aggregate([
        {
          $match: {
            function_id: functionExists.function_id,
            is_deleted: { $ne: true },
            org_id: orgId
          }
        },
        {
          $group: {
            _id: "$payer_city",
            count: { $sum: 1 },
            total_amount: { $sum: "$payer_amount" }
          }
        },
        {
          $project: {
            _id: 0,
            city: "$_id",
            count: 1,
            total_amount: 1
          }
        },
        {
          $sort: { total_amount: -1 }
        }
      ]);
      
      const response = {
        success: true,
        data: cityDistribution
      };
      
      // Set cache (5 minutes)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 300 // Expire in 300 seconds (5 minutes)
      });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting city distribution:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get city distribution: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get city distribution due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get contribution range distribution for a function
// @route   GET /api/functions/:functionId/amount-distribution
// @access  Private
export const getAmountDistribution = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
      const customRanges = req.query.ranges ? String(req.query.ranges).split(',') : null;
      
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
      
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
        return;
      }
      
      // Cache key (including custom ranges if specified) - include org name to avoid cache conflicts
      const cacheKey = `api:${orgName}:functions:${functionId}:amount-distribution${customRanges ? `:${customRanges.join('_')}` : ''}`;
      
      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }
      
      console.log(`Getting amount distribution for function ${functionId}`);
      
      // Get all payers for this function
      const payers = await PayerModel.find({
        function_id: functionExists.function_id,
        is_deleted: { $ne: true },
        org_id: orgId
      }).select('payer_amount').lean();
      
      console.log(`Found ${payers.length} payers for amount distribution analysis`);
      
      // Define ranges - either use custom or default
      let ranges: { min: number; max: number | null; label: string }[] = [];
      
      if (customRanges) {
        ranges = customRanges.map(range => {
          const [min, max] = range.split('-');
          return {
            min: parseInt(min),
            max: max === '+' ? null : parseInt(max),
            label: range
          };
        });
      } else {
        // Default ranges
        ranges = [
          { min: 0, max: 5000, label: '0-5000' },
          { min: 5001, max: 10000, label: '5001-10000' },
          { min: 10001, max: 25000, label: '10001-25000' },
          { min: 25001, max: null, label: '25001+' }
        ];
      }
      
      // Initialize distribution with zeros
      const distribution = ranges.map(range => ({
        range: range.label,
        count: 0,
        total_amount: 0
      }));
      
      // Categorize each payer
      payers.forEach(payer => {
        const amount = payer.payer_amount;
        
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          
          if (amount >= range.min && (range.max === null || amount <= range.max)) {
            distribution[i].count += 1;
            distribution[i].total_amount += amount;
            break;
          }
        }
      });
      
      const response = {
        success: true,
        data: distribution
      };
      
      // Set cache (5 minutes)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 300 // Expire in 300 seconds (5 minutes)
      });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting amount distribution:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get amount distribution: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get amount distribution due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get cash vs gift comparison for a function
// @route   GET /api/functions/:functionId/cash-vs-gifts
// @access  Private
export const getCashVsGifts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
      
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
      
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
        return;
      }
      
      // Cache key - include org name to avoid cache conflicts
      // const cacheKey = `api:${orgName}:functions:${functionId}:cash-vs-gifts`;
      
      // Try to get from cache first
      // const cachedData = await redisClient.get(cacheKey);
      // if (cachedData) {
      //   res.status(200).json(JSON.parse(cachedData));
      //   return;
      // }
      
      console.log(`Getting cash vs gifts data for function ${functionId}`);
      
      // Get cash contributions
      const cashData = await PayerModel.aggregate([
        {
          $match: {
            function_id: functionExists.function_id,
            payer_given_object: "Cash", // பணம்
            is_deleted: { $ne: true },
            org_id: orgId
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total_amount: { $sum: "$payer_amount" }
          }
        },
        {
          $project: {
            _id: 0,
            count: 1,
            total_amount: 1
          }
        }
      ]);
      
      console.log(`Found cash contributions: ${cashData.length > 0 ? cashData[0].count : 0}`);
      
      // Get gift contributions and count by gift name
      const giftData = await PayerModel.aggregate([
        {
          $match: {
            function_id: functionExists.function_id,
            payer_given_object: { $ne: "Cash" }, // பணம்
            is_deleted: { $ne: true },
            org_id: orgId
          }
        },
        {
          $group: {
            _id: "$payer_gift_name",
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: "" }
          }
        },
        {
          $project: {
            _id: 0,
            gift_name: "$_id",
            count: 1
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      console.log(`Found ${giftData.length} unique gift types`);
      
      // Get total gift count
      const totalGifts = await PayerModel.countDocuments({
        function_id: functionExists.function_id,
        payer_given_object: { $ne: "Cash" }, // பணம்
        is_deleted: { $ne: true },
        org_id: orgId
      });
      
      console.log(`Total gift contributions: ${totalGifts}`);
      
      const response = {
        success: true,
        data: {
          cash: cashData.length > 0 ? cashData[0] : { count: 0, total_amount: 0 },
          gifts: {
            count: totalGifts,
            gift_types: giftData
          }
        }
      };
      
      // Set cache (5 minutes)
      // await redisClient.set(cacheKey, JSON.stringify(response), {
      //   EX: 300 // Expire in 300 seconds (5 minutes)
      // });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting cash vs gifts:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get cash vs gifts: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get cash vs gifts due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get top contributors for a function
// @route   GET /api/functions/:functionId/top-contributors
// @access  Private
export const getTopContributors = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const functionId = req.params.functionId;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      
      // Get the organization-specific Function and Payer models
      const FunctionModel = getOrganizationModel(orgName, 'functions');
      const PayerModel = getOrganizationModel(orgName, 'payers');
      
      // Check if function exists
      const functionExists = await FunctionModel.findOne({
        function_id: functionId,
        is_deleted: false,
        org_id: orgId
      });
      
      if (!functionExists) {
        next(new ErrorResponse(`Function not found with id of ${functionId}`, 404));
        return;
      }
      
      // Cache key - include org name to avoid cache conflicts
      const cacheKey = `api:${orgName}:functions:${functionId}:top-contributors:${limit}`;
      
      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }
      
      console.log(`Getting top ${limit} contributors for function ${functionId}`);
      
      // Get top contributors
      const topContributors = await PayerModel.find({
        function_id: functionExists.function_id,
        is_deleted: { $ne: true },
        org_id: orgId
      })
      .select('payer_name payer_relation payer_city payer_amount payer_given_object payer_gift_name')
      .sort({ payer_amount: -1 })
      .limit(limit)
      .lean();
      
      console.log(`Found ${topContributors.length} top contributors`);
      
      const response = {
        success: true,
        data: topContributors
      };
      
      // Set cache (5 minutes)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 300 // Expire in 300 seconds (5 minutes)
      });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting top contributors:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get top contributors: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get top contributors due to an unknown error', 500));
      }
    }
  }
);