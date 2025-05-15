import express from 'express';
import { registerUser, loginUser, getMe } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Get current user
router.get('/me', protect, getMe);

export default router;