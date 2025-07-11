import express from 'express';
import {
  createPayer,
  getPayers,
  getPayerById,
  updatePayer,
  deletePayer,
  getDeletedPayers,
  restorePayer,
  permanentlyDeletePayer,
  getPayerByPhoneNumber,
  getUniquePayerNames,
  getUniquePayerGifts,
  getUniquePayerRelations,
  getUniquePayerCities,
  getUniquePayerWorks,
  searchPayers,
  bulkSoftDeletePayers,
  bulkRestorePayers,
  bulkPermanentlyDeletePayers,
} from '../controllers/payer.controller';
import { protect } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(protect);

// Get deleted payers route
router.get('/deleted', getDeletedPayers);
router.get('/unique/names', getUniquePayerNames);
router.get('/unique/gifts', getUniquePayerGifts);
router.get('/unique/relations', getUniquePayerRelations);
router.get('/unique/cities', getUniquePayerCities);
router.get('/unique/works', getUniquePayerWorks);

router.post('/bulk-delete', bulkSoftDeletePayers);
router.post('/bulk-restore', bulkRestorePayers);
router.post('/bulk-permanent-delete', bulkPermanentlyDeletePayers);

// General payer search across all functions
router.get('/search', searchPayers);

// Standard CRUD routes
router.route('/')
  .post(createPayer)
  // .get(cacheMiddleware(300), getPayers);
  .get(getPayers);


// Parameterized routes
router.route('/:id')
  .get(getPayerById)
  // .get(cacheMiddleware(300), getPayerById)
  .put(updatePayer)
  .delete(deletePayer);

// Special routes
router.put('/:id/restore', restorePayer);
router.delete('/:id/permanent', permanentlyDeletePayer);
router.get('/phone/:phoneNumber', getPayerByPhoneNumber);

export default router;