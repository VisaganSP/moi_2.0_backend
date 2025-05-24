import express from 'express';
import { 
  createEditLog,
  getEditLogs, 
  getEditLogsByTarget,
  getEditLogsByUser,
  getEditLogById 
} from '../controllers/editlog.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Define specific routes BEFORE the parameterized routes
// User-specific routes (admin only)
router.get('/user/:userId', admin, getEditLogsByUser);

// Main routes
router.route('/')
  .post(createEditLog)  // All authenticated users can create edit logs
  .get(admin, getEditLogs);  // Admin only for getting all logs

// Get specific edit log by ID
router.route('/:id')
  .get(admin, getEditLogById);  // Admin only

// Target-specific logs (available to all authenticated users)
router.get('/:targetType/:targetId', getEditLogsByTarget);

export default router;