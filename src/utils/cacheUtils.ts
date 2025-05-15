import { redisClient } from '../config/redis';
import { logger } from './logger';
import type { RedisArgument } from 'redis'; // Import this if needed, adjust according to your Redis client

/**
 * Utility to invalidate cache by pattern
 * @param {string} pattern - Cache key pattern to invalidate (e.g., 'api:/functions*')
 */
export const invalidateCacheByPattern = async (
  pattern: string
): Promise<void> => {
  if (!redisClient.isReady) {
    return;
  }

  try {
    // Use '0' as starting cursor value instead of 0
    let cursor: string = '0';
    do {
      // Scan for keys matching pattern
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      // Update the cursor with the string value
      cursor = scanResult.cursor.toString();
      const keys = scanResult.keys;

      // Delete found keys
      if (keys.length > 0) {
        if (keys.length === 1) {
          await redisClient.del(keys[0]);
        } else {
          await redisClient.del(keys);
        }
        logger.debug(
          `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`
        );
      }
    } while (cursor !== '0'); // Compare with string '0' instead of number 0
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error invalidating cache: ${error.message}`);
    } else {
      logger.error('Unknown error invalidating cache');
    }
  }
};

/**
 * Set cache data with expiration
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expiration - Expiration time in seconds
 */
export const setCache = async <T>(
  key: string,
  data: T,
  expiration = 3600
): Promise<void> => {
  if (!redisClient.isReady) {
    return;
  }

  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: expiration
    });
    logger.debug(`Cached data at key: ${key}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error setting cache: ${error.message}`);
    } else {
      logger.error('Unknown error setting cache');
    }
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<T | null>} - Cached data or null
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient.isReady) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (parseError) {
      logger.error(`Error parsing cached JSON: ${key}`);
      return null;
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error getting cache: ${error.message}`);
    } else {
      logger.error('Unknown error getting cache');
    }
    return null;
  }
};