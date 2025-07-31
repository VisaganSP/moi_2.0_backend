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
  getFunctionDenominations,
  searchFunctions,
  bulkDeleteFunctions,
  bulkPermanentlyDeleteFunctions,
  bulkRestoreFunctions,
  getFunctionPaymentMethods
} from '../controllers/function.controller';
import { getPayersByFunction, getTotalPaymentByFunction, searchPayers } from '../controllers/payer.controller';
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


router.get('/deleted', admin, getDeletedFunctions);  // Admin only
router.get('/search', admin, searchFunctions);
router.get('/date-range', getFunctionsByDateRange);  // All authenticated users

router.post('/bulk-delete', admin, bulkDeleteFunctions);  // Admin only
router.post('/bulk-restore', admin, bulkRestoreFunctions);  // Admin only
router.post('/bulk-permanent-delete', admin, bulkPermanentlyDeleteFunctions);  // Admin only

router.route('/')
  .post(admin, createFunction)  // Admin only
  .get(getFunctions);  // All authenticated users

router.route('/:id')
  .get(getFunctionById)  // All authenticated users
  .put(updateFunction)  // Admin or any other authenticated user only
  .delete(admin, deleteFunction);  // Admin only

router.put('/:id/restore', admin, restoreFunction);  // Admin only
router.delete('/:id/permanent', admin, permanentlyDeleteFunction);

// Payer Specific Routes
router.get('/:functionId/payers', getPayersByFunction); // All authenticated users
router.get('/:functionId/total-payment', getTotalPaymentByFunction); // All authenticated users
router.get('/:functionId/payers/search', searchPayers); // All authenticated users

// ===== Visualization Routes =====
router.get('/:functionId/payment-methods', getPaymentMethodDistribution);
router.get('/:functionId/relation-distribution', getRelationDistribution);
router.get('/:functionId/city-distribution', getCityDistribution);
router.get('/:functionId/amount-distribution', getAmountDistribution);
router.get('/:functionId/cash-vs-gifts', getCashVsGifts);
router.get('/:functionId/top-contributors', getTopContributors);

// Denominations route
router.get('/:functionId/denominations', getFunctionDenominations);
router.get('/:functionId/denominations-payment-methods', getFunctionPaymentMethods);

export default router;