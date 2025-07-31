import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import Organization from '../models/Organization.model';
import { ErrorResponse } from '../utils/errorResponse';
import { UserDocument, AuthenticatedRequest, ActiveSession } from '../types';
import bcrypt from 'bcryptjs';

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

// Add these functions to your existing auth.controller.ts file

// @desc    Initiate forgot password - verify email and org, return security questions
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, org_name } = req.body;

      // Validate input
      if (!email || !org_name) {
        next(new ErrorResponse('Email and organization name are required', 400));
        return;
      }

      // Find user in the specified organization
      const user = await User.findOne({ 
        email,
        org_name
      }).select('security_questions');

      if (!user) {
        // Don't reveal if user exists or not for security
        next(new ErrorResponse('If the email exists in this organization, security questions will be provided', 404));
        return;
      }

      // Check if user has security questions set up
      if (!user.security_questions || user.security_questions.length === 0) {
        next(new ErrorResponse('Security questions not set up for this account', 400));
        return;
      }

      // Return only the questions (not the answers)
      const questions = user.security_questions.map((sq: any) => ({
        question: sq.question,
        questionId: sq._id
      }));

      res.status(200).json({
        success: true,
        data: {
          userId: user._id,
          questions
        }
      });
    } catch (error) {
      console.error('Error in forgot password:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to process forgot password: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to process forgot password due to an unknown error', 500));
      }
    }
  }
);

// @desc    Verify security answers and reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, answers, newPassword } = req.body;

      // Validate input
      if (!userId || !answers || !newPassword) {
        next(new ErrorResponse('User ID, answers, and new password are required', 400));
        return;
      }

      // Validate new password length
      if (newPassword.length < 6) {
        next(new ErrorResponse('Password must be at least 6 characters', 400));
        return;
      }

      // Find user
      const user = await User.findById(userId).select('+security_questions.answer');

      if (!user) {
        next(new ErrorResponse('Invalid request', 400));
        return;
      }

      // Verify all security answers
      let allAnswersCorrect = true;
      
      for (const providedAnswer of answers) {
        const securityQuestion = user.security_questions.find(
          (sq: any) => sq._id.toString() === providedAnswer.questionId
        );

        if (!securityQuestion) {
          allAnswersCorrect = false;
          break;
        }

        // Compare answers (case-insensitive)
        const isMatch = await bcrypt.compare(
          providedAnswer.answer.toLowerCase().trim(),
          securityQuestion.answer
        );

        if (!isMatch) {
          allAnswersCorrect = false;
          break;
        }
      }

      if (!allAnswersCorrect) {
        next(new ErrorResponse('Security answers do not match', 401));
        return;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear any active sessions for security
      user.active_session = undefined;
      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to reset password: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to reset password due to an unknown error', 500));
      }
    }
  }
);

// @desc    Set security questions for a user
// @route   POST /api/auth/security-questions
// @access  Private
export const setSecurityQuestions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('Not authorized', 401));
        return;
      }

      const { questions } = req.body;

      // Validate input
      if (!questions || !Array.isArray(questions) || questions.length < 2) {
        next(new ErrorResponse('At least 2 security questions are required', 400));
        return;
      }

      // Hash the answers before storing
      const hashedQuestions = await Promise.all(
        questions.map(async (q: any) => {
          const salt = await bcrypt.genSalt(10);
          const hashedAnswer = await bcrypt.hash(q.answer.toLowerCase().trim(), salt);
          return {
            question: q.question,
            answer: hashedAnswer
          };
        })
      );

      // Update user with security questions
      req.user.security_questions = hashedQuestions;
      await req.user.save();

      res.status(200).json({
        success: true,
        message: 'Security questions set successfully'
      });
    } catch (error) {
      console.error('Error setting security questions:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to set security questions: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to set security questions due to an unknown error', 500));
      }
    }
  }
);

// @desc    Get user's security questions (questions only, not answers)
// @route   GET /api/auth/security-questions
// @access  Private
export const getSecurityQuestions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new ErrorResponse('Not authorized', 401));
        return;
      }

      const questions = req.user.security_questions?.map((sq: any) => ({
        question: sq.question,
        questionId: sq._id
      })) || [];

      res.status(200).json({
        success: true,
        data: {
          questions,
          hasSecurityQuestions: questions.length > 0
        }
      });
    } catch (error) {
      console.error('Error getting security questions:', error);
      if (error instanceof Error) {
        next(new ErrorResponse(`Failed to get security questions: ${error.message}`, 500));
      } else {
        next(new ErrorResponse('Failed to get security questions due to an unknown error', 500));
      }
    }
  }
);