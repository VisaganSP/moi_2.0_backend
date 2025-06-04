import express from 'express';
import {
  createFunction,
  getFunctions,
  getFunctionById,
  updateFunction,
  deleteFunction,
  restoreFunction,
  getDeletedFunctions,
  getFunctionsByDateRange,
  permanentlyDeleteFunction,
  getFunctionDenominations
} from '../controllers/function.controller';
import { getPayersByFunction, getTotalPaymentByFunction } from '../controllers/payer.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

// Import visualization controllers
import {
  getPaymentMethodDistribution,
  getRelationDistribution,
  getCityDistribution,
  getAmountDistribution,
  getCashVsGifts,
  getTopContributors
} from '../controllers/visualization.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Define specific routes BEFORE the parameterized routes
// This ensures Express doesn't treat 'deleted' and 'date-range' as IDs

// Additional admin-only routes - must come BEFORE /:id route
router.get('/deleted', admin, getDeletedFunctions);  // Admin only

// Date range search available to all authenticated users - must come BEFORE /:id route
router.get('/date-range', getFunctionsByDateRange);  // All authenticated users

// Routes with Admin access only for create, update, delete operations
router.route('/')
  .post(admin, createFunction)  // Admin only
  .get(getFunctions);  // All authenticated users

// Parameterized routes AFTER specific routes
router.route('/:id')
  .get(getFunctionById)  // All authenticated users
  .put(admin, updateFunction)  // Admin only
  .delete(admin, deleteFunction);  // Admin only

// Restore route - this is fine because it has a specific suffix after the ID
router.put('/:id/restore', admin, restoreFunction);  // Admin only

// Permanent delete route - should come after specific routes but before parameterized routes
router.delete('/:id/permanent', admin, permanentlyDeleteFunction);

// Payer Specific Routes
// These routes are parameterized by function ID
router.get('/:functionId/payers', getPayersByFunction);
router.get('/:functionId/total-payment', getTotalPaymentByFunction);

// ===== Visualization Routes =====
router.get('/:functionId/payment-methods', getPaymentMethodDistribution);
router.get('/:functionId/relation-distribution', getRelationDistribution);
router.get('/:functionId/city-distribution', getCityDistribution);
router.get('/:functionId/amount-distribution', getAmountDistribution);
router.get('/:functionId/cash-vs-gifts', getCashVsGifts);
router.get('/:functionId/top-contributors', getTopContributors);

// Denominations route
router.get('/:functionId/denominations', getFunctionDenominations);

export default router;