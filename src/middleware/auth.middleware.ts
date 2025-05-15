import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

// Protect routes
export const protect = asyncHandler(
  async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    let token: string | undefined;

    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from Bearer token
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      next(new ErrorResponse('Not authorized to access this route', 401));
      return;
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as DecodedToken;

      // Find user by ID
      const user = await User.findById(decoded.id);

      // Check if user exists
      if (!user) {
        next(new ErrorResponse('User not found', 404));
        return;
      }

      // Add user to request object (now we're sure it's not null)
      req.user = user;
      
      next();
    } catch (error) {
      next(new ErrorResponse('Not authorized to access this route', 401));
    }
  }
);

// Admin middleware
export const admin = asyncHandler(
  async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      next(new ErrorResponse('Not authorized as an admin', 403));
    }
  }
);