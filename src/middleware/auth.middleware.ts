import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.model';
import Organization from '../models/Organization.model';
import { ErrorResponse } from '../utils/errorResponse';
import { AuthenticatedRequest } from '../types';

interface DecodedToken {
  id: string;
  org_id: string;
  org_name: string;
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

      // Verify organization context matches
      if (user.org_name !== decoded.org_name || user.org_id.toString() !== decoded.org_id) {
        next(new ErrorResponse('Invalid organization context', 401));
        return;
      }

      // Get organization settings
      const organization = await Organization.findById(user.org_id);
      if (!organization) {
        next(new ErrorResponse('Organization not found', 404));
        return;
      }

      // Ensure settings exists with default values if missing
      const orgSettings = organization.settings || {
        allow_multiple_sessions: false,
        session_timeout_minutes: 60
      };

      // Check for active session and verify it matches current token
      if (!orgSettings.allow_multiple_sessions) {
        if (!user.active_session) {
          next(new ErrorResponse('No active session. Please login again', 401));
          return;
        }

        if (user.active_session.token !== token) {
          next(new ErrorResponse('Session invalidated. Please login again', 401));
          return;
        }

        // Check session timeout
        const sessionAge = (Date.now() - new Date(user.active_session.last_active).getTime()) / (1000 * 60); // in minutes
        const timeout = orgSettings.session_timeout_minutes || 60; // Default to 60 minutes if not set
        
        if (sessionAge > timeout) {
          // Clear the session
          user.active_session = undefined;
          await user.save({ validateBeforeSave: false });
          next(new ErrorResponse('Session timeout. Please login again', 401));
          return;
        }

        // Update last active timestamp
        user.active_session.last_active = new Date();
        await user.save({ validateBeforeSave: false });
      }

      // Add user and organization to request object
      req.user = user;
      req.organization = organization as any;
      
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
    // Allow access to both admin and superadmin users
    if (req.user && (req.user.isAdmin || req.user.isSuperAdmin)) {
      next();
    } else {
      next(new ErrorResponse('Not authorized as an admin', 403));
    }
  }
);

// SuperAdmin middleware - only superadmins can access these routes
export const superAdmin = asyncHandler(
  async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.user && req.user.isSuperAdmin) {
      next();
    } else {
      next(new ErrorResponse('Not authorized as a superadmin', 403));
    }
  }
);

// Organization middleware - restrict access to specific organization
export const restrictToOrganization = (orgName: string) => asyncHandler(
  async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.user && req.user.org_name === orgName) {
      next();
    } else {
      next(new ErrorResponse(`Not authorized to access ${orgName} resources`, 403));
    }
  }
);