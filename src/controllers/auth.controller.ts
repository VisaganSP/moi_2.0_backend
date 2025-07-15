import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import Organization from '../models/Organization.model';
import { ErrorResponse } from '../utils/errorResponse';
import { UserDocument, AuthenticatedRequest, ActiveSession } from '../types';

// Generate JWT Token with organization context
const generateToken = (userId: string, orgId: string, orgName: string): string => {
  const payload = {
    id: userId,
    org_id: orgId,
    org_name: orgName
  };
  
  const secret = process.env.JWT_SECRET || 'visagan_the_software_engineer';
  const expiry = process.env.JWT_EXPIRE || '30d';
  
  return jwt.sign(payload, secret, { expiresIn: expiry as any });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, email, password, org_id, org_name, isAdmin } = req.body;

      // Check if organization exists
      const organization = await Organization.findOne({ 
        $or: [
          { _id: org_id },
          { org_name: org_name }
        ]
      });

      if (!organization) {
        next(new ErrorResponse('Organization not found', 404));
        return;
      }

      // Check if user exists in this organization
      const userExists = await User.findOne({ 
        email,
        org_name: organization.org_name
      });

      if (userExists) {
        next(new ErrorResponse('User already exists in this organization', 400));
        return;
      }

      // Determine admin status
      // If the request has isAdmin field and it's from a superadmin, respect that value
      // Otherwise, default to false
      let isAdminValue = false;
      
      // If isAdmin is provided and is true, verify the request is from a superadmin
      if (isAdmin === true) {
        const requestUser = (req as AuthenticatedRequest).user;
        
        // If not authenticated or not a superadmin, reject admin creation
        if (!requestUser || !requestUser.isSuperAdmin) {
          next(new ErrorResponse('Not authorized to create admin users', 403));
          return;
        }
        
        // If requestor is a superadmin, allow admin creation
        isAdminValue = true;
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
        isAdmin: isAdminValue,
        org_id: organization._id,
        org_name: organization.org_name
      });

      // Generate token with organization context
      const token = generateToken(
        String(user._id),
        organization._id.toString(),
        organization.org_name
      );

      // Store active session
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const ipAddress = req.ip || '0.0.0.0';
      
      const activeSession: ActiveSession = {
        token,
        device_info: userAgent,
        ip_address: ipAddress,
        last_active: new Date()
      };
      
      user.active_session = activeSession;
      await user.save({ validateBeforeSave: false });

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          org_id: user.org_id,
          org_name: user.org_name,
          token
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to register user: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to register user due to an unknown error', 500));
      }
    }
  }
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, org_name } = req.body;

      // Check if organization is provided
      if (!org_name) {
        next(new ErrorResponse('Organization name is required', 400));
        return;
      }

      // Check for user in the specified organization
      const user = await User.findOne({ 
        email,
        org_name
      }).select('+password');

      if (!user) {
        next(new ErrorResponse('Invalid credentials', 401));
        return;
      }

      // Check if password matches
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        next(new ErrorResponse('Invalid credentials', 401));
        return;
      }

      // Get organization to check settings
      const organization = await Organization.findById(user.org_id);
      if (!organization) {
        next(new ErrorResponse('Organization not found', 404));
        return;
      }

      // Generate token with organization context
      const token = generateToken(
        String(user._id),
        user.org_id.toString(),
        user.org_name
      );

      // Get client info for session tracking
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const ipAddress = req.ip || '0.0.0.0';

      // Create or update active session
      const activeSession: ActiveSession = {
        token,
        device_info: userAgent,
        ip_address: ipAddress,
        last_active: new Date()
      };
      
      user.active_session = activeSession;
      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          org_id: user.org_id,
          org_name: user.org_name,
          token
        }
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to login: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to login due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('Not authorized', 401));
        return;
      }
      
      // Access user directly
      const user = req.user;
      const organization = req.organization;

      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          org_id: user.org_id,
          org_name: user.org_name,
          organization: organization ? {
            _id: organization._id,
            org_id: organization.org_id,
            display_name: organization.display_name,
            org_name: organization.org_name
          } : null
        }
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to fetch user: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to fetch user due to an unknown error', 500));
      }
    }
  }
);

// @desc    Logout user (invalidate session)
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('Not authorized', 401));
        return;
      }

      // Clear the active session
      const user = req.user;
      user.active_session = undefined;
      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Error logging out user:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to logout: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to logout due to an unknown error', 500));
      }
    }
  }
);

// @desc    Check organization login status
// @route   GET /api/auth/organization-status/:orgName
// @access  Public
export const checkOrganizationLoginStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName } = req.params;
      
      // Check if organization exists
      const organization = await Organization.findOne({ org_name: orgName })
        .select('org_id org_name display_name settings')
        .lean();
      
      if (!organization) {
        next(new ErrorResponse(`Organization not found with name ${orgName}`, 404));
        return;
      }
      
      res.status(200).json({
        success: true,
        data: {
          org_id: organization.org_id,
          org_name: organization.org_name,
          display_name: organization.display_name,
          login_enabled: true, // You can add a setting to control this
          settings: {
            allow_multiple_sessions: organization.settings?.allow_multiple_sessions ?? false,
            session_timeout_minutes: organization.settings?.session_timeout_minutes ?? 60
          }
        }
      });
    } catch (error) {
      console.error('Error checking organization status:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to check organization status: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to check organization status due to an unknown error', 500));
      }
    }
  }
);