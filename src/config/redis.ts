import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Creating a Redis client instance
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Error handling
redisClient.on('error', (err) => {
  logger.error(`Redis Client Error: ${err}`);
});

// Connection confirmation
redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

// Connection lost
redisClient.on('end', () => {
  logger.info('Redis Client Connection Closed');
});

// Connect to Redis
const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Failed to connect to Redis: ${err.message}`);
    } else {
      logger.error('Unknown error occurred connecting to Redis');
    }
    // Retry connection after 5 seconds
    setTimeout(connectRedis, 5000);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  logger.info('Redis connection closed');
  process.exit(0);
});

export { connectRedis, redisClient };