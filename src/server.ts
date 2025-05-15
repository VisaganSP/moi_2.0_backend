import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

// Load config
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import functionRoutes from './routes/function.routes';
import payerRoutes from './routes/payer.routes';

// Import DB and Redis connections
import connectDB from './config/db';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { ErrorResponse } from './utils/errorResponse';

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body
app.use(compression()); // Compress responses

// Log HTTP requests in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/payers', payerRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    console.log('Health check endpoint hit');
    console.log('Request headers:');
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack);
  
  const statusCode = err instanceof ErrorResponse ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../../client/dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;