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
  permanentlyDeleteFunction
} from '../controllers/function.controller';
import { getPayersByFunction, getTotalPaymentByFunction } from '../controllers/payer.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Define specific routes BEFORE the parameterized routes
// This ensures Express doesn't treat 'deleted' and 'date-range' as IDs

// Additional admin-only routes - must come BEFORE /:id route
router.get('/deleted', admin, getDeletedFunctions);  // Admin only

// Date range search available to all authenticated users - must come BEFORE /:id route
router.get('/date-range', cacheMiddleware(300), getFunctionsByDateRange);  // All authenticated users

// Routes with Admin access only for create, update, delete operations
router.route('/')
  .post(admin, createFunction)  // Admin only
  .get(cacheMiddleware(300), getFunctions);  // All authenticated users

// Parameterized routes AFTER specific routes
router.route('/:id')
  .get(cacheMiddleware(300), getFunctionById)  // All authenticated users
  .put(admin, updateFunction)  // Admin only
  .delete(admin, deleteFunction);  // Admin only

// Restore route - this is fine because it has a specific suffix after the ID
router.put('/:id/restore', admin, restoreFunction);  // Admin only

// Permanent delete route - should come after specific routes but before parameterized routes
router.delete('/:id/permanent', admin, permanentlyDeleteFunction);

// Payer Specific Routes
// These routes are parameterized by function ID
router.get('/:functionId/payers', cacheMiddleware(300), getPayersByFunction);
router.get('/:functionId/total-payment', cacheMiddleware(300), getTotalPaymentByFunction);

export default router;