import { redisClient } from '../db/redis.ts';
import { generateShortCode } from '../utils/base62.ts';

const KGS_KEY = 'kgs:available_keys';
const POOL_SIZE = 1000;
const REFILL_THRESHOLD = 200;

export const getShortCodeFromKGS = async (): Promise<string> => {
  // sPop atomically removes and returns a random element from the Redis Set
  let code = await redisClient.sPop(KGS_KEY);
  
  if (!code) {
    console.warn("⚠️ KGS pool empty! Generating on the fly as fallback.");
    code = generateShortCode(6);
  }
  
  // Fire-and-forget: check if we need to refill the pool
  checkAndRefillPool();
  
  return code;
};

export const checkAndRefillPool = async () => {
  try {
    const count = await redisClient.sCard(KGS_KEY);
    
    // If we have enough keys, do nothing
    if (count >= REFILL_THRESHOLD) return;

    console.log(`⚙️ KGS pool low (${count} remaining). Refilling to ${POOL_SIZE}...`);
    const needed = POOL_SIZE - count;
    const generated = new Set<string>();

    // Generate unique codes up to the needed amount
    while (generated.size < needed) {
      generated.add(generateShortCode(6));
    }

    const candidateCodes = Array.from(generated);
    
    // Push the new batch into the Redis Set
    if (candidateCodes.length > 0) {
      await redisClient.sAdd(KGS_KEY, candidateCodes);
      console.log(`✅ KGS added ${candidateCodes.length} new keys to the pool.`);
    }
  } catch (error) {
    console.error("❌ Error refilling KGS pool:", error);
  }
};