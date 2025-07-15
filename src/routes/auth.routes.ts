import express from 'express';
import { registerUser, loginUser, getMe, logoutUser, checkOrganizationLoginStatus } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Register a new user
router.post('/register', registerUser);
router.post('/register/admin', protect, registerUser);

// Login user
router.post('/login', loginUser);

// Get current user
router.get('/me', protect, getMe);

// Logout user (if you want to add this functionality)
router.post('/logout', protect, logoutUser);

// Check organization login status
router.get('/organization-status/:orgName', checkOrganizationLoginStatus);

export default router;