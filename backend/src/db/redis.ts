import { createClient } from 'redis';
import { config } from 'dotenv';

config();

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis cache');
  } catch (err) {
    console.error('Failed to connect to Redis', err);
  }
})();