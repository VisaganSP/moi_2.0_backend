import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Middleware for caching API responses
 * @param {number} duration - Cache duration in seconds
 */
export const cacheMiddleware = (duration = 3600) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Create a unique cache key
    const cacheKey = `api:${req.originalUrl}`;

    // Check if Redis client is ready
    if (!redisClient.isReady) {
      next();
      return;
    }

    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache hit for: ${req.originalUrl}`);
        res.status(200).json(JSON.parse(cachedResponse));
        return;
      }

      logger.debug(`Cache miss for: ${req.originalUrl}`);

      // If no cache, continue but store response
      const originalJson = res.json;

      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient
            .set(cacheKey, JSON.stringify(body), {
              EX: duration
            })
            .catch((err) => logger.error(`Redis cache error: ${err}`));
        }

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Cache middleware error: ${error.message}`);
      } else {
        logger.error('Unknown cache middleware error');
      }
      next();
    }
  };
};