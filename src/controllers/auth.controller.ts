import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import { ErrorResponse } from '../utils/errorResponse';
import { UserDocument, AuthenticatedRequest } from '../types';

// Generate JWT Token
const generateToken = (id: string): string => {
  // Using explicit type for expiresIn with ms
  const expiry = process.env.JWT_EXPIRE || '30d';
  
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET as string, 
    {
      // Use as any to bypass the type check or you can properly type it
      expiresIn: expiry as any
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      next(new ErrorResponse('User already exists', 400));
      return;
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password
    });

    // Explicitly convert ObjectId to string
    const userId = String(user._id);
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token
      }
    });
  }
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      next(new ErrorResponse('Invalid credentials', 401));
      return;
    }

    // Explicitly convert ObjectId to string
    const userId = String(user._id);
    const token = generateToken(userId);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token
      }
    });
  }
);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ErrorResponse('Not authorized', 401);
    }
    
    // Access user directly without type assertion
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  }
);