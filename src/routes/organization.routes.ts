// server/src/routes/organization.routes.ts

import express from 'express';
import { 
  createOrganization,
  getOrganizations,
  getPublicOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  checkOrganizationExists,
  getOrganizationStats,
  manageSuperadmin,
  getSuperadmins,
  // New subscription endpoints
  getOrganizationSubscription,
  updateOrganizationSubscription
} from '../controllers/organization.controller';
import { protect, superAdmin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Public routes
router.get('/public', cacheMiddleware(300), getPublicOrganizations);
router.get('/check/:orgName', checkOrganizationExists);

// All other routes require authentication
router.use(protect);

// Subscription routes - getSubscription is available to admins and users for their own org
router.get('/:id/subscription', getOrganizationSubscription);

// Routes below require superadmin privileges
router.use(superAdmin);

// Subscription management - update is superadmin only
router.put('/:id/subscription', updateOrganizationSubscription);

// Superadmin management routes
router.route('/superadmins')
  .get(getSuperadmins)
  .post(manageSuperadmin);

// Stats route
router.get('/stats', getOrganizationStats);

// Main CRUD routes
router.route('/')
  .post(createOrganization)
  .get(cacheMiddleware(300), getOrganizations);

router.route('/:id')
  .get(cacheMiddleware(300), getOrganization)
  .put(updateOrganization)
  .delete(deleteOrganization);

export default router;