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
  // Subscription endpoints
  getOrganizationSubscription,
  updateOrganizationSubscription,
  getSubscriptionPlans
} from '../controllers/organization.controller';
import { protect, superAdmin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Public routes
router.get('/public', cacheMiddleware(300), getPublicOrganizations);
router.get('/check/:orgName', checkOrganizationExists);
router.get('/subscription-plans', cacheMiddleware(3600), getSubscriptionPlans); // Cache for 1 hour

// All other routes require authentication
router.use(protect);

// Subscription routes - getSubscription is available to all authenticated users
router.get('/:orgName/subscription', getOrganizationSubscription);

// Routes below require superadmin privileges
router.use(superAdmin);

// Subscription management - update is superadmin only
router.put('/:orgName/subscription', updateOrganizationSubscription);

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

// Changed these routes to use orgName instead of id
router.route('/:orgName')
  .get(cacheMiddleware(300), getOrganization)
  .put(updateOrganization)
  .delete(deleteOrganization);

export default router;